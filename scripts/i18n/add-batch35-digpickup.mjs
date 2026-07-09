#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // dig.c
  'chop': '劈砍', 'dig in': '挖入', 'chop through': '劈穿',
  'chopping off %s own %s': '劈掉%s自己的%s',
  'The statue shatters.': '雕像碎裂了。', 'The boulder falls apart.': '巨石散裂开来。',
  'You cut down the tree.': '你砍倒了这棵树。',
  'You succeed in cutting away some rock.': '你成功凿掉了一些岩石。',
  'You make an opening in the wall.': '你在墙上开了个洞。',
  'You break through a secret door!': '你破开了一道暗门！',
  'You break through the door.': '你破开了门。',
  'break': '破坏', 'rock': '岩石', 'statue': '雕像', 'tree': '树', 'ruin': '毁坏',
  'As you dig, the hole fills with %s!': '你挖掘时，洞里灌满了%s！',
  'digging': '挖掘', 'chopping': '劈砍',
  '%s own %s': '%s自己的%s',
  'stuck in a spider web': '被蛛网困住', 'You pull free.': '你挣脱了出来。',
  'swinging': '挥舞', 'chipping the statue': '凿击雕像', 'hitting the boulder': '敲击巨石',
  'chopping at the door': '劈砍门', 'cutting the tree': '砍树',
  'wall': '墙',
  'enlisting': '应征入伍', 'marching': '游行', 'protesting': '抗议', 'fleeing': '逃亡',
  'The foundation is too hard to dig through from this angle.': '从这个角度，地基太硬无法挖穿。',
  "The tree's roots glow then fade.": '树根发出光芒，随后暗淡下来。',
  'The rock glows then fades.': '岩石发出光芒，随后暗淡下来。',
  'The bars go much deeper than your pit.': '铁栏比你的坑深得多。',
  'A tangled mass of plumbing remains below the sink.': '水槽下方残留着一团纠缠的管道。',
  'The ladder is unaffected.': '梯子毫发无损。',
  'drawbridge': '吊桥',
  'The %s%ssupporting structures remain intact.': '%s%s支撑结构仍然完好。',
  'Suddenly %s flows in from the adjacent pit!': '突然，%s从相邻的坑里涌了进来！',
  // pickup.c
  'You have a little trouble lifting': '你有点吃力地举起',
  'You have much trouble lifting': '你相当吃力地举起',
  'You have extreme difficulty lifting': '你极其艰难地举起',
  'You have a little trouble removing': '你有点吃力地移除',
  'You have much trouble removing': '你相当吃力地移除',
  'lifting': '举起', 'removing': '移除',
  'inside': '里面',
  'Pick up what?': '捡起什么？', 'Pick up ': '捡起',
  'you cannot ': '你无法', ' any more': '更多', 'it ': '它', 'even one ': '哪怕一个',
  'is too heavy for you to ': '太重，你无法', '.  Continue?': '。继续吗？',
  'loot': '搜刮', "don't find anything": '什么都没找到',
  'There is ': '这里有', ' here, loot it?': '，要搜刮吗？', 'a container': '一个容器',
  'Loot in what direction?': '朝哪个方向搜刮？', 'Invalid loot location': '无效的搜刮位置',
  'You find old loot:': '你找到了旧的赃物：',
  "Schroedinger's Cat": '薛定谔的猫',
  'opening a container': '打开容器',
  ' is empty.  Do what with it?': '是空的。要对它做什么？', 'This': '这个',
  'Do what with ': '要对……做什么', ' or ?': ' 或 ?',
  ' here, tip it?': '，要倾倒吗？', 'container': '容器',
  'oil': '油', 'crumbs': '碎屑', 'tipping a container': '倾倒容器',
  // container-loot help (explaintext[]) — key letters preserved for input
  'Container actions:': '容器操作：',
  ' : -- Look: examine contents': ' : -- 查看：检视内容物',
  ' o -- Out: take things out': ' o -- 取出：拿出物品',
  ' i -- In: put things in': ' i -- 放入：放进物品',
  ' b -- Both: first take things out, then put things in': ' b -- 两者：先取出，再放入',
  ' r -- Reversed: put things in, then take things out': ' r -- 反向：先放入，再取出',
  ' s -- Stash: put one item in': ' s -- 藏入：放入一件物品',
  ' n -- Next: loot next selected container': ' n -- 下一个：搜刮下一个选中的容器',
  ' q -- Quit: finished': ' q -- 退出：完成',
  ' ? -- Help: display this text.': ' ? -- 帮助：显示此文本。',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
