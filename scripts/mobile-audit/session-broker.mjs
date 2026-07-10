// Dev-only session broker for the Mobile-UI-audit tool.
//
// Lets the /mobile-ui-audit.html page LAUNCH, CHAT WITH, and MONITOR a headless
// Claude review-issue loop per issue. One child process per issue id, so several
// issues can be worked in parallel. State is kept in memory (this module loads
// once per dev server) and exposed over a tiny REST API. The child is a normal
// `claude -p` run of the /review-issue command, driven over STREAMING INPUT so a
// human can drop guidance into the live session mid-run.
//
// Every run posts a "Claude (run)" comment to the issue thread the MOMENT it
// starts — with live session metadata and an attached run-log file that keeps
// updating as the session runs — and finalizes that same comment when the run
// ends (or you hit Stop). The log file is flushed to disk continuously, so the
// history survives even if a run ends unexpectedly.
//
// SAFETY: start/stop are LOCALHOST-ONLY (they refuse non-loopback callers), so
// even though the dev server binds 0.0.0.0 a LAN peer can't launch processes.
// Launching is on by default; set MOBILE_AUDIT_SESSIONS=0 to hard-disable it.
//
// Env knobs:
//   MOBILE_AUDIT_SESSIONS=0            hard-disable launching (default: enabled)
//   MOBILE_AUDIT_CLAUDE_BIN=claude     the CLI to spawn
//   MOBILE_AUDIT_CLAUDE_ARGS=...        override the extra claude flags
//   MOBILE_AUDIT_MAX_CONCURRENCY=3     max simultaneous live sessions
//   MOBILE_AUDIT_IDLE_MS=90000         auto-finish a run after this much quiet

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LOG_CAP = 1000;     // activity lines retained per session (for the log file)
const IDLE_MS = () => Math.max(3000, parseInt(process.env.MOBILE_AUDIT_IDLE_MS || '90000', 10) || 90000);
const TERMINAL = new Set(['done', 'failed', 'stopped', 'error']);
const ID_RE = /^[a-z0-9][a-z0-9-]*$/i;

/** issueId -> session record (in-memory, single writer = this module) */
const sessions = new Map();

const nowIso = () => new Date().toISOString();
const enabled = () =>
  process.env.MOBILE_AUDIT_SESSIONS !== '0' && process.env.MOBILE_AUDIT_SESSIONS !== 'false';
const maxConcurrency = () =>
  Math.max(1, parseInt(process.env.MOBILE_AUDIT_MAX_CONCURRENCY || '3', 10) || 3);
const runningCount = () =>
  [...sessions.values()].filter(s => !TERMINAL.has(s.state)).length;

function isLocal(req) {
  const a = req.socket?.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

/** Serialize a session for the wire (drop live handles + timers + buffers). */
function view(s) {
  return {
    issueId: s.issueId,
    state: s.state,
    activity: s.activity,
    sessionId: s.sessionId,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    exitCode: s.exitCode,
    maxIter: s.maxIter,
    numTurns: s.numTurns,
    costUsd: s.costUsd,
    humanMsgs: s.humanMsgs,
    runId: s.runId,
    logFile: s.logRel,
    logTail: s.log.slice(-120),
    pendingComments: s.pendingComments,
  };
}

function pushLog(s, kind, text) {
  if (text == null) return;
  const line = String(text).replace(/\s+$/, '');
  if (!line) return;
  s.log.push({ ts: nowIso(), kind, text: line.slice(0, 600) });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
  s._logDirty = true; // the live log-file writer flushes this on its next tick
  if (kind === 'text' || kind === 'result' || kind === 'tool' || kind === 'state')
    s.activity = line.slice(0, 200);
}

/**
 * Build the review-issue prompt by inlining the project command file, so we
 * don't depend on headless slash-command expansion. Substitutes $1/$2/$ARGUMENTS
 * and strips the YAML frontmatter. Read fresh each launch so edits are picked up.
 */
function buildPrompt(repoRoot, issueId, maxIter) {
  const cmdPath = path.join(repoRoot, '.claude', 'commands', 'review-issue.md');
  let body = readFileSync(cmdPath, 'utf-8').replace(/^﻿/, '');
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) body = body.slice(fm[0].length);
  const args = `${issueId} ${maxIter}`;
  return body
    .split('$ARGUMENTS').join(args)
    .split('$1').join(issueId)
    .split('$2').join(String(maxIter))
    .trim();
}

// ---------- live process I/O ----------

/** Feed a user turn into the running session over stream-json stdin. */
function sendUserMessage(s, text) {
  const line = JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n';
  try { s._child.stdin.write(line); } catch { /* child may be gone */ }
}

function killTree(s) {
  const pid = s._child?.pid;
  if (!pid) return;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }); } catch {}
  } else {
    try { s._child.kill('SIGTERM'); } catch {}
    setTimeout(() => { try { s._child.kill('SIGKILL'); } catch {} }, 2000);
  }
}

/** Arm the "quiet since the loop finished → wrap up" watchdog. The loop's work
    is already persisted once it's idle, so we kill the waiting child directly —
    closing stdin can't reliably EOF through the Windows cmd.exe shell wrapper. */
function armIdle(s) {
  clearTimeout(s._idle);
  s._idle = setTimeout(() => {
    if (TERMINAL.has(s.state) || s.state === 'running') return;
    s.finalReason = s.finalReason || 'completed';
    pushLog(s, 'state', 'no further input — wrapping up the run');
    killTree(s); // → 'exit' → markExit(reason 'completed')
  }, IDLE_MS());
}

// ---------- run record: one live "Claude (run)" comment per run ----------
// A run posts its thread comment IMMEDIATELY on start (metadata + an attached
// log file), keeps rewriting that broker-owned log file as the session runs,
// and finalizes the SAME comment (matched by runId) when the run ends. Only two
// findings.json writes happen — start and end, both while the child is NOT
// writing — so the live updates never race the child. The log file is on disk
// throughout, so the history survives even if a run ends unexpectedly.

/** Stable per-run log path (decided once from startedAt, then rewritten in place). */
function ensureLogPath(dir, s) {
  if (s.logRel) return;
  const stamp = s.startedAt.replace(/[:.]/g, '-');
  s.logRel = path.posix.join('mobile-audit', 'updates', s.issueId, `run-${stamp}.log`);
  s.logAbs = path.join(dir, 'updates', s.issueId, `run-${stamp}.log`);
}

/** (Re)write the run log file to its stable path. Broker-owned file — no race. */
function writeLog(dir, s) {
  ensureLogPath(dir, s);
  const live = !TERMINAL.has(s.state);
  const head =
    `# Claude run · ${s.issueId}\n` +
    `# session ${s.sessionId || '?'} · started ${s.startedAt} · ${live ? 'RUNNING (' + s.state + ')' : 'ended ' + (s.endedAt || nowIso())}\n` +
    `# turns ${s.numTurns ?? '?'} · cost ${s.costUsd != null ? '$' + s.costUsd : '?'} · reviewer msgs ${s.humanMsgs}\n\n`;
  const lines = s.log.map(l => `${(l.ts || '').slice(11, 19)} [${l.kind}] ${l.text}`).join('\n');
  mkdirSync(path.dirname(s.logAbs), { recursive: true });
  writeFileSync(s.logAbs, head + lines + '\n');
  s._logDirty = false;
  return { rel: s.logRel, count: s.log.length };
}

function durationStr(s) {
  const a = Date.parse(s.startedAt), b = Date.parse(s.endedAt || nowIso());
  if (!a || !b || b < a) return '?';
  const sec = Math.round((b - a) / 1000);
  return sec < 90 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

/** The "Claude (run)" comment body for a phase: 'running' or a terminal reason. */
function runCommentText(s, phase, logCount) {
  const running = phase === 'running';
  const label = running ? '🟢 running'
    : ({ completed: '✓ completed', stopped: '⏹ stopped by user', failed: '✗ failed', error: '⚠ errored' }[phase] || phase);
  const meta =
    `session ${s.sessionId || 'starting…'} · ${s.numTurns ?? 0} turns · ` +
    `${s.costUsd != null ? '$' + Number(s.costUsd).toFixed(4) : 'cost n/a'}` +
    (s.humanMsgs ? ` · ${s.humanMsgs} reviewer msg(s)` : '');
  const head = `Run ${label} · started ${s.startedAt}${running ? '' : ' · ' + durationStr(s)}`;
  const tail = running
    ? `\nLive — the attached run log (${logCount ?? s.log.length} lines so far) keeps updating as the session runs; reopen it to see progress. This comment finalizes when the run ends.`
    : `\nFinal: ${(s.finalResult || '—').slice(0, 400)}`;
  return `${head}\n${meta}${tail}`;
}

/** Read findings.json, run mutate(issue) for this run's issue, write it back. */
function editIssue(findingsPath, s, mutate) {
  const doc = JSON.parse(readFileSync(findingsPath, 'utf-8'));
  const issue = (doc.issues || []).find(i => i.id === s.issueId);
  if (!issue) return false;
  if (!Array.isArray(issue.comments)) issue.comments = [];
  mutate(issue);
  writeFileSync(findingsPath, JSON.stringify(doc, null, 2));
  return true;
}

/** Post the immediate run comment (metadata + live log attachment) at start. */
function postRunStart(findingsPath, s) {
  try {
    const log = writeLog(path.dirname(findingsPath), s);
    editIssue(findingsPath, s, issue => {
      issue.comments.push({
        runId: s.runId,
        author: 'Claude (run)',
        ts: s.startedAt,
        text: runCommentText(s, 'running', log.count),
        files: [{ label: 'run log · live', file: log.rel }],
      });
    });
  } catch (e) {
    pushLog(s, 'stderr', 'failed to post run start: ' + (e && e.message));
  }
}

/** While the run is live, periodically flush the log FILE (never findings.json). */
function armLogWriter(s) {
  clearInterval(s._logTimer);
  s._logTimer = setInterval(() => {
    if (TERMINAL.has(s.state)) { clearInterval(s._logTimer); return; }
    if (s._logDirty) { try { writeLog(s._dir, s); } catch { /* transient */ } }
  }, 3000);
}

/**
 * Finalize the run: last log write, flush any mid-run reviewer comments, and
 * UPDATE the same "Claude (run)" comment (matched by runId) to its terminal
 * state. Called AFTER the child exits, so it never races the child's writes.
 */
function postRunEnd(findingsPath, s, reason) {
  clearInterval(s._logTimer);
  try {
    const log = writeLog(path.dirname(findingsPath), s);
    editIssue(findingsPath, s, issue => {
      for (const c of s.pendingComments) issue.comments.push(c);
      const files = [{ label: `run log · ${log.count} lines`, file: log.rel }];
      const text = runCommentText(s, reason, log.count);
      const existing = issue.comments.find(c => c.runId === s.runId);
      if (existing) { existing.ts = s.endedAt || nowIso(); existing.text = text; existing.files = files; }
      else issue.comments.push({ runId: s.runId, author: 'Claude (run)', ts: s.endedAt || nowIso(), text, files });
    });
    s.pendingComments = [];
  } catch (e) {
    pushLog(s, 'stderr', 'failed to post run summary: ' + (e && e.message));
  }
}

/** Land the terminal state exactly once and write the run record. */
function markExit(findingsPath, s, reason, code) {
  if (TERMINAL.has(s.state)) return;
  clearTimeout(s._idle);
  clearTimeout(s._killer);
  clearInterval(s._logTimer);
  if (code != null) s.exitCode = code;
  s.state = { completed: 'done', stopped: 'stopped', failed: 'failed', error: 'error' }[reason] || 'done';
  s.endedAt = s.endedAt || nowIso();
  pushLog(s, 'state', `run ${reason}${code != null ? ` (exit ${code})` : ''}`);
  postRunEnd(findingsPath, s, reason);
}

// ---------- stream-json event parsing ----------

function handleEvent(findingsPath, s, e) {
  if (!e || typeof e !== 'object') return;
  if (e.type === 'system' && e.subtype === 'init') {
    s.sessionId = e.session_id || s.sessionId;
    s.state = 'running';
    pushLog(s, 'state', `running · session ${s.sessionId || '?'}`);
    return;
  }
  if (e.type === 'assistant' && e.message?.content) {
    if (s.state === 'idle') s.state = 'running'; // a fresh turn began (likely from a reviewer message)
    for (const b of e.message.content) {
      if (b.type === 'text' && b.text?.trim()) {
        pushLog(s, 'text', b.text.trim().replace(/\s+/g, ' '));
      } else if (b.type === 'tool_use') {
        const hint = b.name === 'Bash' ? (b.input?.command || '') :
          (b.input?.file_path || b.input?.path || b.input?.pattern || '');
        pushLog(s, 'tool', `→ ${b.name}${hint ? ': ' + String(hint).slice(0, 120) : ''}`);
      }
    }
    return;
  }
  if (e.type === 'result') {
    s.numTurns = e.num_turns;
    s.costUsd = e.total_cost_usd;
    if (e.result) s.finalResult = String(e.result).replace(/\s+/g, ' ');
    if (e.subtype === 'success') {
      if (s.finalResult) pushLog(s, 'result', s.finalResult.slice(0, 300));
      s.state = 'idle';
      pushLog(s, 'state', 'loop finished — reply to continue, or Stop to wrap up');
      armIdle(s);
    } else {
      s.finalReason = 'failed';
      pushLog(s, 'state', `ended: ${e.subtype || 'error'}`);
      killTree(s); // → 'exit' → markExit(reason 'failed')
    }
  }
}

function startSession({ repoRoot, findingsPath }, issueId, maxIter) {
  const bin = process.env.MOBILE_AUDIT_CLAUDE_BIN || 'claude';
  // Headless runs can't answer permission prompts, so the loop (Bash/Edit/Write)
  // must run unattended. Override the whole flag list with MOBILE_AUDIT_CLAUDE_ARGS.
  const extraArgs = (process.env.MOBILE_AUDIT_CLAUDE_ARGS || '--dangerously-skip-permissions').trim();
  const prompt = buildPrompt(repoRoot, issueId, maxIter);

  const startedAt = nowIso();
  const s = {
    issueId, maxIter,
    state: 'starting', activity: 'starting…',
    sessionId: null, startedAt, endedAt: null, exitCode: null,
    numTurns: null, costUsd: null, finalResult: null, finalReason: null,
    humanMsgs: 0, log: [], pendingComments: [],
    runId: `${issueId}@${startedAt}`, logRel: null, logAbs: null,
    _child: null, _buf: '', _idle: null, _killer: null,
    _dir: path.dirname(findingsPath), _logTimer: null, _logDirty: false,
  };
  sessions.set(issueId, s);
  pushLog(s, 'state', `launching \`${bin} -p /review-issue ${issueId} ${maxIter}\` (${extraArgs})`);
  // Post the run's thread comment (metadata + live log attachment) NOW, before
  // the child spawns, so this findings.json write can't race the child's writes.
  postRunStart(findingsPath, s);
  armLogWriter(s);

  // Streaming input (prompt + mid-run reviewer messages arrive as user turns over
  // stdin). Flags carry no spaces, so shell:true is safe on Windows (claude .cmd).
  const args = ['-p', '--output-format', 'stream-json', '--input-format', 'stream-json',
    '--verbose', ...extraArgs.split(/\s+/).filter(Boolean)];
  let child;
  try {
    child = spawn(bin, args, { cwd: repoRoot, env: process.env, shell: true, windowsHide: true });
  } catch (e) {
    pushLog(s, 'stderr', 'spawn failed: ' + (e && e.message));
    markExit(findingsPath, s, 'error');
    return s;
  }
  s._child = child;
  s.pid = child.pid;

  sendUserMessage(s, prompt); // keep stdin OPEN for mid-run chat

  child.stdout.on('data', chunk => {
    s._buf += chunk.toString('utf-8');
    let nl;
    while ((nl = s._buf.indexOf('\n')) >= 0) {
      const line = s._buf.slice(0, nl).trim();
      s._buf = s._buf.slice(nl + 1);
      if (!line) continue;
      try { handleEvent(findingsPath, s, JSON.parse(line)); }
      catch { /* non-JSON noise; ignore */ }
    }
  });
  child.stderr.on('data', chunk => {
    const t = chunk.toString('utf-8').trim();
    if (t) pushLog(s, 'stderr', t.split('\n').slice(-3).join(' '));
  });
  child.on('error', err => { pushLog(s, 'stderr', 'process error: ' + (err && err.message)); markExit(findingsPath, s, 'error'); });
  child.on('exit', code => {
    const reason = s.finalReason || (code === 0 ? 'completed' : 'error');
    markExit(findingsPath, s, reason, code);
  });
  return s;
}

function stopSession(issueId) {
  const s = sessions.get(issueId);
  if (!s || TERMINAL.has(s.state)) return false;
  s.finalReason = 'stopped';
  s.endedAt = nowIso();
  pushLog(s, 'state', 'stopped by user');
  killTree(s); // → 'exit' → markExit(reason 'stopped') writes the run record
  return true;
}

// ---------- HTTP wiring ----------
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
}
function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

/**
 * Mount the session API on a connect/Vite middleware stack.
 * @param {import('connect').Server} middlewares  server.middlewares
 * @param {{repoRoot:string, findingsPath:string}} opts
 */
export function installSessionApi(middlewares, opts) {
  const { repoRoot, findingsPath } = opts;

  middlewares.use('/api/mobile-audit/sessions', (req, res) => {
    const out = {};
    for (const [id, s] of sessions) out[id] = view(s);
    sendJson(res, 200, { enabled: enabled(), running: runningCount(), maxConcurrency: maxConcurrency(), sessions: out });
  });

  middlewares.use('/api/mobile-audit/session', async (req, res) => {
    try {
      const url = new URL(req.originalUrl || req.url, 'http://x');
      const action = url.pathname.split('/').filter(Boolean).pop(); // start|stop|comment|clear
      if (req.method === 'GET') {
        const id = url.searchParams.get('issueId');
        const s = id && sessions.get(id);
        return sendJson(res, 200, { session: s ? view(s) : null });
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });

      const body = await readJson(req);
      const issueId = String(body.issueId || '').trim();
      if (!ID_RE.test(issueId)) return sendJson(res, 400, { error: 'invalid issueId' });

      if (action === 'comment') {
        // Record it for the thread AND forward it into the live session now.
        const s = sessions.get(issueId);
        const text = String(body.text || '').trim();
        if (!s || TERMINAL.has(s.state)) return sendJson(res, 409, { error: 'no running session for this issue' });
        if (!text) return sendJson(res, 400, { error: 'empty comment' });
        const author = String(body.author || 'Reviewer');
        s.pendingComments.push({ author, text, ts: nowIso() });
        s.humanMsgs++;
        sendUserMessage(s, `[Reviewer ${author} note, mid-run]: ${text}`);
        if (s.state === 'idle') s.state = 'running';
        clearTimeout(s._idle);
        pushLog(s, 'state', `↩ forwarded a comment from ${author} into the live session`);
        return sendJson(res, 200, { ok: true, session: view(s) });
      }
      if (action === 'clear') {
        const s = sessions.get(issueId);
        if (s && !TERMINAL.has(s.state)) return sendJson(res, 409, { error: 'session still running' });
        sessions.delete(issueId);
        return sendJson(res, 200, { ok: true });
      }

      // start / stop are privileged: localhost-only + master switch.
      if (!enabled())
        return sendJson(res, 403, { error: 'session launching is disabled (MOBILE_AUDIT_SESSIONS=0).' });
      if (!isLocal(req))
        return sendJson(res, 403, { error: 'session control is localhost-only' });

      if (action === 'stop') {
        const ok = stopSession(issueId);
        return sendJson(res, ok ? 200 : 409, ok ? { ok: true } : { error: 'no running session' });
      }
      if (action === 'start') {
        const existing = sessions.get(issueId);
        if (existing && !TERMINAL.has(existing.state))
          return sendJson(res, 409, { error: 'a session is already running for this issue' });
        if (runningCount() >= maxConcurrency())
          return sendJson(res, 429, { error: `at max concurrency (${maxConcurrency()} running). Stop one or raise MOBILE_AUDIT_MAX_CONCURRENCY.` });
        let maxIter = parseInt(body.maxIter, 10);
        if (!Number.isFinite(maxIter) || maxIter < 1) maxIter = 10;
        maxIter = Math.min(maxIter, 50);
        const s = startSession({ repoRoot, findingsPath }, issueId, maxIter);
        return sendJson(res, 200, { ok: true, session: view(s) });
      }
      return sendJson(res, 404, { error: 'unknown action' });
    } catch (e) {
      return sendJson(res, 500, { error: String((e && e.stack) || e) });
    }
  });
}
