/* WebHack player interaction: engine-side resolution and execution.
 * collvey/WebHack-Steam#35; design: "玩家互动优化" and its four sub-pages.
 * See include/whinteract.h for the overall flow.
 *
 * Only reads what the hero knows: monsters through canspotmon() with
 * disguised and hidden ones left out, traps only when tseen, doors and the
 * "remembered, unseen monster" marker through the displayed glyph (never
 * the real doormask), objects underfoot only when look_here() would list
 * them. Nothing here changes game state.
 */

#include "hack.h"
#include "func_tab.h"
#include "whinteract.h"
#include <stdarg.h>

/* ------------------------------------------------------------------------
 * JSON buffer
 * ------------------------------------------------------------------------ */

struct jb {
    char *p;
    size_t n, cap;
};

static void
jb_grow(struct jb *b, size_t more)
{
    if (b->n + more + 1 <= b->cap)
        return;
    while (b->n + more + 1 > b->cap)
        b->cap = b->cap ? b->cap * 2 : 4096;
    b->p = (char *) realloc(b->p, b->cap);
}

static void
jb_put(struct jb *b, const char *s)
{
    size_t l = strlen(s);

    jb_grow(b, l);
    memcpy(b->p + b->n, s, l);
    b->n += l;
    b->p[b->n] = '\0';
}

static void
jb_printf(struct jb *b, const char *fmt, ...)
{
    char tmp[512];
    va_list ap;

    va_start(ap, fmt);
    (void) vsnprintf(tmp, sizeof tmp, fmt, ap);
    va_end(ap);
    jb_put(b, tmp);
}

static void
jb_str(struct jb *b, const char *s)
{
    char tmp[8];

    jb_put(b, "\"");
    for (; s && *s; s++) {
        unsigned char c = (unsigned char) *s;

        if (c == '"' || c == '\\') {
            tmp[0] = '\\', tmp[1] = (char) c, tmp[2] = '\0';
            jb_put(b, tmp);
        } else if (c < 0x20) {
            Sprintf(tmp, "\\u%04x", c);
            jb_put(b, tmp);
        } else {
            tmp[0] = (char) c, tmp[1] = '\0';
            jb_put(b, tmp);
        }
    }
    jb_put(b, "\"");
}

/* list of action names: ["a","b"] */
struct acts {
    const char *v[24];
    int n;
};

static void
act_add(struct acts *a, const char *name)
{
    if (a->n < (int) SIZE(a->v))
        a->v[a->n++] = name;
}

static void
jb_acts(struct jb *b, const struct acts *a)
{
    int i;

    jb_put(b, "\"acts\":[");
    for (i = 0; i < a->n; i++) {
        if (i)
            jb_put(b, ",");
        jb_str(b, a->v[i]);
    }
    jb_put(b, "]");
}

/* ------------------------------------------------------------------------
 * What the hero knows
 * ------------------------------------------------------------------------ */

static schar last_dx = 0, last_dy = -1; /* "facing": last nonzero u.dx/u.dy */

static void
update_facing()
{
    if (u.dx || u.dy) {
        last_dx = u.dx;
        last_dy = u.dy;
    }
}

static boolean
carrying_pick()
{
    return (carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK)) ? TRUE : FALSE;
}

static boolean
carrying_unlocker()
{
    return (carrying(SKELETON_KEY) || carrying(LOCK_PICK)
            || carrying(CREDIT_CARD)) ? TRUE : FALSE;
}

static boolean
carrying_class(oclass)
int oclass;
{
    struct obj *o;

    for (o = invent; o; o = o->nobj)
        if (o->oclass == oclass)
            return TRUE;
    return FALSE;
}

static boolean
at_upstairs(x, y)
int x, y;
{
    return ((x == xupstair && y == yupstair)
            || (x == sstairs.sx && y == sstairs.sy && sstairs.up)
            || (x == xupladder && y == yupladder)) ? TRUE : FALSE;
}

static boolean
at_dnstairs(x, y)
int x, y;
{
    return ((x == xdnstair && y == ydnstair)
            || (x == sstairs.sx && y == sstairs.sy && !sstairs.up)
            || (x == xdnladder && y == ydnladder)) ? TRUE : FALSE;
}

/* look_here() lists no objects under water (unless underwater) or lava;
   while blind the hero would have to feel the floor, which we never do */
static boolean
floor_objects_known()
{
    if (Blind || u.uswallow)
        return FALSE;
    if (is_lava(u.ux, u.uy))
        return FALSE;
    if (is_pool(u.ux, u.uy) && !Underwater)
        return FALSE;
    return TRUE;
}

/* the terrain underfoot: a stable key the client maps to its slot */
static const char *
terrain_key(x, y)
int x, y;
{
    int typ = levl[x][y].typ;

    if (at_upstairs(x, y))
        return (x == xupladder && y == yupladder) ? "ladder_up" : "stairs_up";
    if (at_dnstairs(x, y))
        return (x == xdnladder && y == ydnladder) ? "ladder_down"
                                                 : "stairs_down";
    if (IS_FOUNTAIN(typ))
        return "fountain";
    if (IS_SINK(typ))
        return "sink";
    if (IS_THRONE(typ))
        return "throne";
    if (IS_ALTAR(typ))
        return "altar";
    if (IS_GRAVE(typ))
        return "grave";
    if (is_lava(x, y))
        return "lava";
    if (is_pool(x, y))
        return "water";
    if (Is_airlevel(&u.uz))
        return "air";
    if (Is_waterlevel(&u.uz))
        return "water";
    if (is_ice(x, y))
        return "ice";
    if (IS_DOOR(typ))
        return "doorway";
    if (typ == DRAWBRIDGE_DOWN)
        return "drawbridge";
    if (typ == CORR)
        return "corridor";
    return "floor";
}

static boolean
engravable_terrain(key)
const char *key;
{
    return (!strcmp(key, "lava") || !strcmp(key, "water")
            || !strcmp(key, "air")) ? FALSE : TRUE;
}

/* Adjacent square kinds */
enum adjkind {
    AK_NONE = 0, AK_HOSTILE, AK_PEACEFUL, AK_PET, AK_PASSIVE, AK_MONSTER,
    AK_INVIS, AK_DOOR_CLOSED, AK_DOOR_OPEN, AK_BOULDER, AK_TRAP, AK_WALL,
    AK_FLOOR
};

static const char *const adjkind_names[] = {
    "none", "hostile", "peaceful", "pet", "passive", "monster", "invis",
    "door_closed", "door_open", "boulder", "trap", "wall", "floor"
};

/* a monster the hero can see as a monster: not disguised, not hidden */
static struct monst *
seen_monster(x, y)
int x, y;
{
    struct monst *m = m_at(x, y);

    if (!m || !canspotmon(m) || m->mundetected)
        return (struct monst *) 0;
    if (M_AP_TYPE(m) == M_AP_FURNITURE || M_AP_TYPE(m) == M_AP_OBJECT)
        return (struct monst *) 0;
    return m;
}

/* hack.c monster_nearby(): the conditions that interrupt resting */
static boolean
threatening(m)
struct monst *m;
{
    return (!m->mpeaceful && !noattacks(m->data) && m->mcanmove
            && !m->msleeping && (!m->minvis || See_invisible)
            && !onscary(u.ux, u.uy, m)) ? TRUE : FALSE;
}

static enum adjkind
adj_kind(x, y, mp)
int x, y;
struct monst **mp;
{
    struct monst *m = seen_monster(x, y);
    int glyph = glyph_at(x, y);

    *mp = m;
    if (m) {
        if (Hallucination)
            return AK_MONSTER;
        if (m->mtame)
            return AK_PET;
        if (m->mpeaceful)
            return AK_PEACEFUL;
        if (noattacks(m->data))
            return AK_PASSIVE;
        return AK_HOSTILE;
    }
    if (glyph_is_invisible(glyph))
        return AK_INVIS;
    if (glyph_is_cmap(glyph)) {
        int cm = glyph_to_cmap(glyph);

        if (cm == S_vcdoor || cm == S_hcdoor)
            return AK_DOOR_CLOSED;
        if (cm == S_vodoor || cm == S_hodoor)
            return AK_DOOR_OPEN;
        if (cm >= S_stone && cm <= S_trwall)
            return AK_WALL;
        if (cm == S_tree || cm == S_bars)
            return AK_WALL;
        return AK_FLOOR;
    }
    if (glyph_is_trap(glyph))
        return AK_TRAP;
    if (glyph_is_object(glyph) && glyph_to_obj(glyph) == BOULDER)
        return AK_BOULDER;
    return AK_FLOOR;
}

/* ------------------------------------------------------------------------
 * Default target and action (sub-page 默认目标和默认动作)
 * ------------------------------------------------------------------------ */

struct wh_default {
    int lv;          /* 1..11 */
    const char *at;  /* "engulf", "adj", "here", or null */
    int dx, dy;
    const char *slot; /* for "here": "terrain", "container", "items" */
    const char *act;
};

/* direction indexes (xdir/ydir run clockwise from west), nearest the
   facing direction first; on a tie the hero's right hand side first */
static void
dir_order(order)
int order[8];
{
    int f = xytod(last_dx, last_dy), i, k = 0;

    if (f < 0)
        f = 2; /* north */
    order[k++] = f;
    for (i = 1; i <= 3; i++) {
        order[k++] = (f + i) % 8; /* clockwise = right hand */
        order[k++] = (f - i + 8) % 8;
    }
    order[k++] = (f + 4) % 8;
}

static boolean
diag_ok(d)
int d;
{
    return (!NODIAG(u.umonnum) || (xdir[d] == 0 || ydir[d] == 0)) ? TRUE
                                                                 : FALSE;
}

static void
compute_default(def)
struct wh_default *def;
{
    int order[8], i, d, x, y, found, fd = -1;
    struct monst *m;
    struct obj *o;
    boolean reach = can_reach_floor(TRUE);
    boolean impaired = (Confusion || Stunned || Hallucination) ? TRUE : FALSE;
    boolean objs = floor_objects_known();
    enum adjkind k;

    memset(def, 0, sizeof *def);
    dir_order(order);

    /* 1: engulfed */
    if (u.uswallow && u.ustuck) {
        def->lv = 1, def->at = "engulf", def->act = "attack";
        return;
    }
    /* 2: held */
    if (u.ustuck && !u.uswallow) {
        def->lv = 2, def->at = "adj", def->act = "attack";
        def->dx = u.ustuck->mx - u.ux, def->dy = u.ustuck->my - u.uy;
        return;
    }
    if (!impaired) {
        /* 3: threatening hostile; 4: hostile that can't act;
           5: remembered unseen monster */
        int lv;

        for (lv = 3; lv <= 5; lv++)
            for (i = 0; i < 8; i++) {
                d = order[i];
                if (!diag_ok(d))
                    continue;
                x = u.ux + xdir[d], y = u.uy + ydir[d];
                if (!isok(x, y))
                    continue;
                k = adj_kind(x, y, &m);
                if ((lv == 3 && k == AK_HOSTILE && threatening(m))
                    || (lv == 4 && k == AK_HOSTILE && !threatening(m))
                    || (lv == 5 && k == AK_INVIS)) {
                    def->lv = lv, def->at = "adj", def->act = "attack";
                    def->dx = xdir[d], def->dy = ydir[d];
                    return;
                }
            }
    }
    /* 6: stairs or ladder underfoot (down needs to reach the floor) */
    if (at_upstairs(u.ux, u.uy)) {
        def->lv = 6, def->at = "here", def->slot = "terrain", def->act = "up";
        return;
    }
    if (at_dnstairs(u.ux, u.uy) && reach) {
        def->lv = 6, def->at = "here", def->slot = "terrain";
        def->act = "down";
        return;
    }
    /* 7: container underfoot; 8: other items underfoot */
    if (reach && objs) {
        boolean cont = FALSE, other = FALSE;

        for (o = level.objects[u.ux][u.uy]; o; o = o->nexthere) {
            if (o == uchain)
                continue;
            if (Is_container(o))
                cont = TRUE;
            else if (o->oclass != FOOD_CLASS)
                other = TRUE;
        }
        if (cont) {
            def->lv = 7, def->at = "here", def->slot = "container";
            def->act = "loot";
            return;
        }
        if (other) {
            def->lv = 8, def->at = "here", def->slot = "items";
            def->act = "pickup";
            return;
        }
    }
    if (!impaired) {
        /* 9: the square in front is a closed door or a peaceful;
           10: exactly one such among the other seven */
        found = 0;
        for (i = 0; i < 8; i++) {
            d = order[i];
            if (!diag_ok(d))
                continue;
            x = u.ux + xdir[d], y = u.uy + ydir[d];
            if (!isok(x, y))
                continue;
            k = adj_kind(x, y, &m);
            if (k != AK_DOOR_CLOSED && k != AK_PEACEFUL)
                continue;
            if (i == 0) {
                def->lv = 9, def->at = "adj";
                def->act = (k == AK_DOOR_CLOSED) ? "open" : "chat";
                def->dx = xdir[d], def->dy = ydir[d];
                return;
            }
            if (!found++)
                fd = d;
        }
        if (found == 1) {
            x = u.ux + xdir[fd], y = u.uy + ydir[fd];
            k = adj_kind(x, y, &m);
            def->lv = 10, def->at = "adj";
            def->act = (k == AK_DOOR_CLOSED) ? "open" : "chat";
            def->dx = xdir[fd], def->dy = ydir[fd];
            return;
        }
    }
    /* 11: nothing */
    def->lv = 11, def->at = (const char *) 0, def->act = "search";
}

/* ------------------------------------------------------------------------
 * INTERACT payload
 * ------------------------------------------------------------------------ */

static void
json_terrain(b, reach)
struct jb *b;
boolean reach;
{
    char fbuf[BUFSZ];
    const char *key = terrain_key(u.ux, u.uy);
    const char *feat = dfeature_at(u.ux, u.uy, fbuf);
    struct acts a;

    memset(&a, 0, sizeof a);
    if (!strcmp(key, "stairs_up") || !strcmp(key, "ladder_up"))
        act_add(&a, "up");
    if (!strcmp(key, "stairs_down") || !strcmp(key, "ladder_down"))
        act_add(&a, "down");
    if (!strcmp(key, "fountain") || !strcmp(key, "sink"))
        act_add(&a, "drink");
    if (!strcmp(key, "fountain") || !strcmp(key, "water"))
        act_add(&a, "dip");
    if (!strcmp(key, "sink") && carrying_class(RING_CLASS))
        act_add(&a, "dropring");
    if (!strcmp(key, "throne"))
        act_add(&a, "sit");
    if (!strcmp(key, "altar")) {
        act_add(&a, "offer");
        act_add(&a, "pray");
        if (invent)
            act_add(&a, "drop");
    }
    if (carrying_pick())
        act_add(&a, "dig");
    if (engravable_terrain(key))
        act_add(&a, "engrave");
    if (strcmp(key, "throne"))
        act_add(&a, "sit");
    act_add(&a, "look");

    jb_put(b, "{\"k\":\"terrain\",\"t\":");
    jb_str(b, key);
    jb_printf(b, ",\"g\":%d,\"n\":", back_to_glyph(u.ux, u.uy));
    jb_str(b, feat ? _(feat) : _(defsyms[IS_DOOR(levl[u.ux][u.uy].typ)
                                         ? S_ndoor
                                         : (levl[u.ux][u.uy].typ == CORR)
                                               ? S_corr
                                               : S_room].explanation));
    jb_printf(b, ",\"reach\":%s,", reach ? "true" : "false");
    jb_acts(b, &a);
    jb_put(b, "}");
}

static void
json_trap(b, t)
struct jb *b;
struct trap *t;
{
    struct acts a;

    memset(&a, 0, sizeof a);
    if (t->ttyp != VIBRATING_SQUARE)
        act_add(&a, "untrap");
    if ((t->ttyp == HOLE || t->ttyp == TRAPDOOR)
        || ((t->ttyp == PIT || t->ttyp == SPIKED_PIT)
            && uteetering_at_seen_pit(t)))
        act_add(&a, "down");
    act_add(&a, "idtrap");
    act_add(&a, "look");

    jb_printf(b, "{\"k\":\"trap\",\"t\":%d,\"g\":%d,\"n\":", t->ttyp,
              trap_to_glyph(t, rn2_on_display_rng));
    jb_str(b, _(defsyms[trap_to_defsym(t->ttyp)].explanation));
    jb_printf(b, ",\"in\":%s,",
              (u.utrap && (u.utraptype == TT_PIT || u.utraptype == TT_BEARTRAP
                           || u.utraptype == TT_WEB))
                  ? "true" : "false");
    jb_acts(b, &a);
    jb_put(b, "}");
}

static void
json_engr(b, e)
struct jb *b;
struct engr *e;
{
    struct acts a;

    memset(&a, 0, sizeof a);
    act_add(&a, "engrave");
    act_add(&a, "look");
    jb_printf(b, "{\"k\":\"engr\",\"et\":%d,\"n\":", (int) e->engr_type);
    jb_str(b, e->engr_txt);
    jb_put(b, ",");
    jb_acts(b, &a);
    jb_put(b, "}");
}

static void
json_obj(b, o)
struct jb *b;
struct obj *o;
{
    struct acts a;
    boolean corpse = (o->otyp == CORPSE) ? TRUE : FALSE;

    memset(&a, 0, sizeof a);
    if (o != uchain)
        act_add(&a, "pickup");
    if (o->oclass != COIN_CLASS && is_edible(o) && !u.usteed)
        act_add(&a, "eat");
    if (corpse)
        act_add(&a, "offer");
    if (corpse && tinnable(o) && carrying(TINNING_KIT))
        act_add(&a, "tin");
    if (Is_container(o)) {
        act_add(&a, "loot");
        act_add(&a, "tip");
    }
    if (Is_box(o)) {
        if (carrying_unlocker())
            act_add(&a, "unlock");
        if (uwep)
            act_add(&a, "force");
        act_add(&a, "untrap");
    }
    if (o->dknown && objtyp_is_callable(o->otyp))
        act_add(&a, "name");
    act_add(&a, "look");

    jb_printf(b, "{\"k\":\"obj\",\"id\":%u,\"g\":%d,\"otyp\":%d,\"c\":%d,"
                 "\"q\":%ld,\"wt\":%d,\"n\":",
              o->o_id, obj_to_glyph(o, rn2_on_display_rng), o->otyp,
              (int) o->oclass, o->quan, (int) o->owt);
    jb_str(b, doname_with_price(o));
    jb_printf(b, ",\"cont\":%s,\"box\":%s,\"corpse\":%s,\"food\":%s,"
                 "\"chain\":%s,",
              Is_container(o) ? "true" : "false",
              Is_box(o) ? "true" : "false", corpse ? "true" : "false",
              (o->oclass == FOOD_CLASS) ? "true" : "false",
              (o == uchain) ? "true" : "false");
    jb_acts(b, &a);
    jb_put(b, "}");
}

static void
json_adjacent(b)
struct jb *b;
{
    int d, x, y, first = 1;
    struct monst *m;
    enum adjkind k;
    struct acts a;
    struct trap *t;

    jb_put(b, "\"adj\":[");
    for (d = 0; d < 8; d++) {
        x = u.ux + xdir[d], y = u.uy + ydir[d];
        if (!isok(x, y) || u.uswallow)
            continue;
        k = adj_kind(x, y, &m);
        memset(&a, 0, sizeof a);
        switch (k) {
        case AK_HOSTILE:
        case AK_PASSIVE:
        case AK_MONSTER:
        case AK_INVIS:
            act_add(&a, "attack");
            if (k != AK_INVIS) {
                act_add(&a, "chat");
                act_add(&a, "kick");
            }
            break;
        case AK_PEACEFUL:
            act_add(&a, "chat");
            act_add(&a, "attack");
            act_add(&a, "kick");
            break;
        case AK_PET:
            act_add(&a, "move");
            act_add(&a, "chat");
            act_add(&a, "kick");
            break;
        case AK_DOOR_CLOSED:
            act_add(&a, "open");
            if (carrying_unlocker())
                act_add(&a, "unlock");
            act_add(&a, "kick");
            act_add(&a, "untrap");
            break;
        case AK_DOOR_OPEN:
            act_add(&a, "close");
            act_add(&a, "move");
            break;
        case AK_TRAP:
            t = t_at(x, y);
            if (t && t->tseen && t->ttyp != VIBRATING_SQUARE)
                act_add(&a, "untrap");
            act_add(&a, "idtrap");
            act_add(&a, "move");
            break;
        case AK_BOULDER:
        case AK_FLOOR:
            act_add(&a, "move");
            break;
        default:
            break;
        }
        act_add(&a, "look");
        if (!first)
            jb_put(b, ",");
        first = 0;
        jb_printf(b, "{\"dx\":%d,\"dy\":%d,\"k\":\"%s\",\"g\":%d,", xdir[d],
                  ydir[d], adjkind_names[k], glyph_at(x, y));
        if (m) {
            jb_put(b, "\"n\":");
            jb_str(b, Hallucination ? _("monster") : x_monnam(m, ARTICLE_NONE,
                                                           (char *) 0, 0,
                                                           FALSE));
            jb_printf(b, ",\"threat\":%s,\"still\":%s,\"saddled\":%s,"
                         "\"leashed\":%s,\"saddleable\":%s,",
                      (k == AK_HOSTILE && threatening(m)) ? "true" : "false",
                      (!m->mcanmove || m->msleeping) ? "true" : "false",
                      (k == AK_PET && which_armor(m, W_SADDLE)) ? "true" : "false",
                      m->mleashed ? "true" : "false",
                      (k == AK_PET && !which_armor(m, W_SADDLE)
                       && can_saddle(m)) ? "true" : "false");
        }
        jb_acts(b, &a);
        jb_put(b, "}");
    }
    jb_put(b, "]");
}

static void
json_spells(b)
struct jb *b;
{
    int i;

    jb_put(b, "\"spells\":[");
    for (i = 0; i < MAXSPELL && spellid(i) != NO_SPELL; i++) {
        if (i)
            jb_put(b, ",");
        jb_printf(b, "{\"i\":%d,\"otyp\":%d,\"dir\":%s,\"n\":", i,
                  spellid(i),
                  (objects[spellid(i)].oc_dir != NODIR) ? "true" : "false");
        jb_str(b, _(OBJ_NAME(objects[spellid(i)])));
        jb_put(b, "}");
    }
    jb_put(b, "]");
}

char *
wh_interact_json()
{
    struct jb b;
    struct wh_default def;
    struct obj *o;
    struct trap *t;
    struct engr *e;
    struct acts self;
    boolean reach = can_reach_floor(TRUE);

    memset(&b, 0, sizeof b);
    update_facing();
    compute_default(&def);

    jb_printf(&b, "{\"hx\":%d,\"hy\":%d,\"face\":[%d,%d],\"reach\":%s,"
                  "\"blind\":%s,\"swallowed\":%s,",
              u.ux, u.uy, last_dx, last_dy, reach ? "true" : "false",
              Blind ? "true" : "false", u.uswallow ? "true" : "false");

    /* default */
    jb_printf(&b, "\"def\":{\"lv\":%d,\"at\":", def.lv);
    if (def.at)
        jb_str(&b, def.at);
    else
        jb_put(&b, "null");
    jb_printf(&b, ",\"dx\":%d,\"dy\":%d,\"slot\":", def.dx, def.dy);
    if (def.slot)
        jb_str(&b, def.slot);
    else
        jb_put(&b, "null");
    jb_put(&b, ",\"act\":");
    jb_str(&b, def.act);
    jb_put(&b, "},");

    /* self */
    memset(&self, 0, sizeof self);
    act_add(&self, "search");
    act_add(&self, "rest");
    act_add(&self, "chat");
    act_add(&self, "pray");
    if (Upolyd)
        act_add(&self, "monster");
    act_add(&self, "look");
    jb_put(&b, "\"self\":{");
    jb_acts(&b, &self);
    jb_put(&b, "},");

    /* underfoot */
    jb_put(&b, "\"here\":[");
    if (!u.uswallow) {
        json_terrain(&b, reach);
        if ((t = t_at(u.ux, u.uy)) != 0 && t->tseen) {
            jb_put(&b, ",");
            json_trap(&b, t);
        }
        if ((e = engr_at(u.ux, u.uy)) != 0 && e->engr_txt[0]
            && (!Blind || e->engr_type == ENGRAVE
                || e->engr_type == HEADSTONE || e->engr_type == BURN)) {
            jb_put(&b, ",");
            json_engr(&b, e);
        }
        if (floor_objects_known())
            for (o = level.objects[u.ux][u.uy]; o; o = o->nexthere) {
                jb_put(&b, ",");
                json_obj(&b, o);
            }
    }
    jb_put(&b, "],");

    json_adjacent(&b);
    jb_put(&b, ",");
    json_spells(&b);
    jb_put(&b, "}");
    return b.p;
}

/* ------------------------------------------------------------------------
 * Pending action and pre-selection
 * ------------------------------------------------------------------------ */

#define WH_MAXIDS 64

static struct {
    boolean valid;
    char a[32];
    unsigned ids[WH_MAXIDS];
    int nids;
    int dx, dy, dz;
    int spell;
    boolean terrain, trap;
    char lets[WH_MAXIDS]; /* chosen inventory letters, in order; '-' = fingers */
    int key;              /* "cmd": the command key */
    char ext[32];         /* "cmd": or the extended command's name */
    char hand;            /* 'l' / 'r': which ring finger */
} pending;

static struct {
    boolean active;
    unsigned ids[WH_MAXIDS];
    boolean used[WH_MAXIDS];
    int nids;
    boolean terrain, trap;
    int spell;
    char lets[WH_MAXIDS];
    int letpos;
    char a[32];
    char hand;
    boolean pos;
    coord cc;
} pre;

static const char *
json_find(json, key)
const char *json, *key;
{
    char pat[48];
    const char *p;

    Sprintf(pat, "\"%s\":", key);
    p = strstr(json, pat);
    return p ? p + strlen(pat) : (const char *) 0;
}

static long
json_int(json, key, dflt)
const char *json, *key;
long dflt;
{
    const char *p = json_find(json, key);

    if (!p)
        return dflt;
    while (*p == ' ')
        p++;
    if (*p != '-' && !digit(*p))
        return dflt;
    return strtol(p, (char **) 0, 10);
}

static boolean
json_bool(json, key)
const char *json, *key;
{
    const char *p = json_find(json, key);

    while (p && *p == ' ')
        p++;
    return (p && !strncmp(p, "true", 4)) ? TRUE : FALSE;
}

void
wh_action_set_json(json)
const char *json;
{
    const char *p;
    int i = 0;

    memset(&pending, 0, sizeof pending);
    pending.spell = -1;
    if (!json)
        return;
    if ((p = json_find(json, "a")) != 0) {
        while (*p == ' ')
            p++;
        if (*p == '"') {
            p++;
            while (*p && *p != '"' && i < (int) sizeof pending.a - 1)
                pending.a[i++] = *p++;
        }
    }
    pending.a[i] = '\0';
    if ((p = json_find(json, "ids")) != 0) {
        while (*p == ' ')
            p++;
        if (*p == '[') {
            p++;
            while (*p && *p != ']' && pending.nids < WH_MAXIDS) {
                char *end;
                unsigned long v;

                while (*p == ' ' || *p == ',')
                    p++;
                if (*p == '-' && p[1] == '1') { /* fingers */
                    pending.ids[pending.nids++] = WH_FINGERS_ID;
                    p += 2;
                    continue;
                }
                if (!digit(*p))
                    break;
                v = strtoul(p, &end, 10);
                pending.ids[pending.nids++] = (unsigned) v;
                p = end;
            }
        }
    }
    if ((p = json_find(json, "inv")) != 0) {
        while (*p == ' ')
            p++;
        if (*p == '"') {
            p++;
            i = 0;
            while (*p && *p != '"' && i < WH_MAXIDS - 1)
                pending.lets[i++] = *p++;
            pending.lets[i] = 0;
        }
    }
    pending.dx = (int) json_int(json, "dx", 0L);
    pending.dy = (int) json_int(json, "dy", 0L);
    pending.dz = (int) json_int(json, "dz", 0L);
    pending.spell = (int) json_int(json, "sp", -1L);
    pending.terrain = json_bool(json, "terrain");
    pending.trap = json_bool(json, "trap");
    pending.key = (int) json_int(json, "key", 0L);
    if ((p = json_find(json, "ext")) != 0) {
        while (*p == ' ')
            p++;
        if (*p == '"') {
            p++;
            for (i = 0; *p && *p != '"' && i < (int) sizeof pending.ext - 1;)
                pending.ext[i++] = *p++;
            pending.ext[i] = '\0';
        }
    }
    if ((p = json_find(json, "hand")) != 0) {
        while (*p == ' ')
            p++;
        if (*p == '"' && (p[1] == 'l' || p[1] == 'r'))
            pending.hand = p[1];
    }
    pending.valid = pending.a[0] ? TRUE : FALSE;
}

static void
presel_from_pending()
{
    int i;

    memset(&pre, 0, sizeof pre);
    pre.active = TRUE;
    for (i = 0; i < pending.nids; i++)
        pre.ids[i] = pending.ids[i];
    pre.nids = pending.nids;
    pre.terrain = pending.terrain;
    pre.trap = pending.trap;
    pre.spell = pending.spell;
    Strcpy(pre.lets, pending.lets);
    pre.letpos = 0;
    Strcpy(pre.a, pending.a);
    pre.hand = pending.hand;
}

/* do_wear.c: the ring finger chosen with the action, or 0 to ask */
char
wh_presel_hand()
{
    return pre.active ? pre.hand : '\0';
}

/* the yes/no question that belongs to the chosen action is answered */
boolean
wh_presel_act(name)
const char *name;
{
    return (pre.active && !strcmp(pre.a, name)) ? TRUE : FALSE;
}

/* getpos(): the square chosen with the action */
boolean
wh_presel_pos(ccp)
coord *ccp;
{
    if (!pre.active || !pre.pos)
        return FALSE;
    *ccp = pre.cc;
    pre.pos = FALSE;
    return TRUE;
}

/* the function behind a command key or an extended command name */
typedef int NDECL((*wh_cmdfn));

static wh_cmdfn
cmd_func(key, ext)
int key;
const char *ext;
{
    const struct ext_func_tab *e;

    if (ext && *ext) {
        for (e = extcmdlist; e->ef_txt; e++)
            if (!strcmp(e->ef_txt, ext))
                return e->ef_funct;
        return 0;
    }
    if (key <= 0 || key > 255 || key == WH_ACTION_KEY)
        return 0;
    e = Cmd.commands[key & 0xff];
    return e ? e->ef_funct : 0;
}

static void
presel_clear()
{
    memset(&pre, 0, sizeof pre);
    pre.spell = -1;
}

boolean
wh_presel_active()
{
    return pre.active;
}

boolean
wh_presel_is(o)
struct obj *o;
{
    int i;

    if (!pre.active || !o)
        return FALSE;
    for (i = 0; i < pre.nids; i++)
        if (pre.ids[i] == o->o_id)
            return TRUE;
    return FALSE;
}

/* getobj(): the next chosen inventory object of an acceptable class */
struct obj *
wh_presel_invent(let)
const char *let;
{
    int i;
    struct obj *o;

    if (!pre.active)
        return (struct obj *) 0;
    /* inventory letters, in the order the prompts come */
    while (pre.lets[pre.letpos]) {
        char c = pre.lets[pre.letpos++];

        if (c == '-')
            return (struct obj *) &zeroobj;
        for (o = invent; o; o = o->nobj)
            if (o->invlet == c)
                break;
        if (!o)
            continue;
        if (let && *let && !index(let, ALL_CLASSES) && !index(let, o->oclass)
            && !(o->oclass == COIN_CLASS && index(let, COIN_CLASS)))
            return (struct obj *) 0; /* wrong kind: ask as usual */
        return o;
    }
    for (i = 0; i < pre.nids; i++) {
        if (pre.used[i])
            continue;
        if (pre.ids[i] == WH_FINGERS_ID) {
            pre.used[i] = TRUE;
            return (struct obj *) &zeroobj;
        }
        for (o = invent; o; o = o->nobj)
            if (o->o_id == pre.ids[i])
                break;
        if (!o)
            continue;
        if (let && *let && !index(let, ALL_CLASSES) && !index(let, o->oclass)
            && !(o->oclass == COIN_CLASS && index(let, COIN_CLASS)))
            continue;
        pre.used[i] = TRUE;
        return o;
    }
    return (struct obj *) 0;
}

/* "There is <obj> here; <verb> it?" while acting on a chosen object */
char
wh_presel_ynq(o, q, def)
struct obj *o;
const char *q;
int def;
{
    if (pre.active)
        return wh_presel_is(o) ? 'y' : 'n';
    return yn_function(q, ynqchars, (char) def);
}

/* "Drink from the fountain?" / "Dip it into the fountain?" */
char
wh_presel_yn_terrain(q)
const char *q;
{
    if (pre.active)
        return pre.terrain ? 'y' : 'n';
    return yn(q);
}

boolean
wh_presel_trap_only()
{
    return (pre.active && pre.trap) ? TRUE : FALSE;
}

boolean
wh_presel_spell(no)
int *no;
{
    if (!pre.active || pre.spell < 0 || pre.spell >= MAXSPELL
        || spellid(pre.spell) == NO_SPELL)
        return FALSE;
    *no = pre.spell;
    pre.spell = -1;
    return TRUE;
}

/* object menus (pickup, loot, tip): how many of the given entries were
   chosen; marks them in sel[] */
int
wh_presel_menu(objs, n)
struct obj **objs;
int n;
{
    int i, k = 0;

    if (!pre.active || !pre.nids)
        return 0;
    for (i = 0; i < n; i++)
        if (wh_presel_is(objs[i]))
            k++;
    return k;
}

/* ------------------------------------------------------------------------
 * Execution
 * ------------------------------------------------------------------------ */

static char
dirkey(dx, dy, dz)
int dx, dy, dz;
{
    int d;

    if (dz > 0)
        return '>';
    if (dz < 0)
        return '<';
    if (!dx && !dy)
        return Cmd.spkeys[NHKF_GETDIR_SELF];
    d = xytod(dx, dy);
    return (d < 0) ? '\0' : Cmd.dirchars[d];
}

/* click_to_cmd(): attack and plain moves go through the normal movement
   code; everything else runs the hidden #whaction command */
const char *
wh_action_cmd()
{
    static char cmd[4];
    struct wh_default def;
    const char *act = pending.a;
    int dx = pending.dx, dy = pending.dy;

    cmd[0] = cmd[1] = cmd[2] = cmd[3] = '\0';
    if (!pending.valid)
        return cmd;
    if (!strcmp(act, "default")) {
        compute_default(&def);
        act = def.act;
        dx = def.dx, dy = def.dy;
        if (!strcmp(act, "attack")) {
            if (!strcmp(def.at, "engulf"))
                dx = 1, dy = 0; /* any direction hits the engulfer */
            cmd[0] = Cmd.spkeys[NHKF_FIGHT];
            cmd[1] = dirkey(dx, dy, 0);
            pending.valid = FALSE;
            return cmd;
        }
        /* keep the resolved action for dowhaction() */
        Strcpy(pending.a, act);
        pending.dx = dx, pending.dy = dy;
        pending.terrain = !strcmp(act, "up") || !strcmp(act, "down");
        pending.nids = 0;
    }
    if (!strcmp(pending.a, "attack") && (dx || dy)) {
        cmd[0] = Cmd.spkeys[NHKF_FIGHT];
        cmd[1] = dirkey(dx, dy, 0);
        pending.valid = FALSE;
        return cmd;
    }
    if (!strcmp(pending.a, "move") && (dx || dy)) {
        cmd[0] = dirkey(dx, dy, 0);
        pending.valid = FALSE;
        return cmd;
    }
    cmd[0] = (char) WH_ACTION_KEY;
    return cmd;
}

static char qbuf[8];

/* put a direction (or nothing) in front of the command's own prompts */
static void
queue_dir(dx, dy, dz)
int dx, dy, dz;
{
    qbuf[0] = dirkey(dx, dy, dz);
    qbuf[1] = '\0';
    wh_queue_keys(qbuf);
}

static boolean
is(a, name)
const char *a, *name;
{
    return !strcmp(a, name) ? TRUE : FALSE;
}

static int pending_key;
static char pending_ext[32];

/* the hidden command bound to WH_ACTION_KEY */
int
dowhaction(VOID_ARGS)
{
    int res = 0, dx, dy, dz;
    char a[32];
    struct obj *o;

    if (!pending.valid)
        return 0;
    Strcpy(a, pending.a);
    dx = pending.dx, dy = pending.dy, dz = pending.dz;
    pending_key = pending.key;
    Strcpy(pending_ext, pending.ext);
    presel_from_pending();
    pending.valid = FALSE;
    wh_queue_keys("");

    /* things done to the square underfoot or to oneself */
    if (is(a, "search"))
        res = dosearch();
    else if (is(a, "rest"))
        res = donull();
    else if (is(a, "look"))
        res = (dx || dy) ? 0 : dolook();
    else if (is(a, "up"))
        res = doup();
    else if (is(a, "down"))
        res = dodown();
    else if (is(a, "drink"))
        res = dodrink();
    else if (is(a, "dip"))
        res = dodip();
    else if (is(a, "sit"))
        res = dosit();
    else if (is(a, "offer"))
        res = dosacrifice();
    else if (is(a, "pray"))
        res = dopray();
    else if (is(a, "drop") || is(a, "dropring"))
        res = dodrop();
    else if (is(a, "engrave"))
        res = doengrave();
    else if (is(a, "dig")) {
        queue_dir(0, 0, 1);
        res = doapply();
    } else if (is(a, "pickup"))
        res = dopickup();
    else if (is(a, "eat"))
        res = doeat();
    else if (is(a, "tin"))
        res = doapply();
    else if (is(a, "loot"))
        res = doloot();
    else if (is(a, "tip"))
        res = dotip();
    else if (is(a, "force"))
        res = doforce();
    else if (is(a, "monster"))
        res = domonability();
    else if (is(a, "attributes"))
    {
        wh_cmdfn f = cmd_func(0, "attributes");

        res = f ? (*f)() : 0;
    }
    else if (is(a, "cmd")) {
        /* an inventory item's action: the command runs with the item chosen */
        wh_cmdfn f = cmd_func(pending_key, pending_ext);

        if (f && f != dowhaction) {
            if (dx || dy || dz)
                queue_dir(dx, dy, dz);
            res = (*f)();
        }
    } else if (is(a, "namemon")) {
        if (dx || dy) {
            pre.pos = TRUE;
            pre.cc.x = u.ux + dx, pre.cc.y = u.uy + dy;
            do_mname();
        }
        res = 0;
    } else if (is(a, "ride")) {
        queue_dir(dx, dy, 0);
        res = doride();
    } else if (is(a, "unsaddle")) {
        struct monst *mtmp = isok(u.ux + dx, u.uy + dy)
                                 ? m_at(u.ux + dx, u.uy + dy) : 0;
        int info = 0;
        boolean prev = FALSE;

        res = (mtmp && (dx || dy)) ? loot_mon(mtmp, &info, &prev) : 0;
    }
    else if (is(a, "name")) {
        for (o = level.objects[u.ux][u.uy]; o; o = o->nexthere)
            if (wh_presel_is(o))
                break;
        if (!o)
            for (o = invent; o; o = o->nobj)
                if (wh_presel_is(o))
                    break;
        if (o && objtyp_is_callable(o->otyp))
            docall(o);
        res = 0;
    }
    /* things done in a direction (self = no dx/dy) */
    else if (is(a, "unlock")) {
        queue_dir(dx, dy, 0);
        res = doapply();
    } else if (is(a, "untrap")) {
        queue_dir(dx, dy, 0);
        res = dountrap();
    } else if (is(a, "idtrap")) {
        queue_dir(dx, dy, 0);
        res = doidtrap();
    } else if (is(a, "chat")) {
        queue_dir(dx, dy, dz);
        res = dotalk();
    } else if (is(a, "kick")) {
        queue_dir(dx, dy, 0);
        res = dokick();
    } else if (is(a, "open")) {
        queue_dir(dx, dy, 0);
        res = doopen();
    } else if (is(a, "close")) {
        queue_dir(dx, dy, 0);
        res = doclose();
    } else if (is(a, "throw")) {
        queue_dir(dx, dy, dz);
        res = dothrow();
    } else if (is(a, "fire")) {
        queue_dir(dx, dy, dz);
        res = dofire();
    } else if (is(a, "zap")) {
        queue_dir(dx, dy, dz);
        res = dozap();
    } else if (is(a, "cast")) {
        queue_dir(dx, dy, dz);
        res = docast();
    } else if (is(a, "apply")) {
        queue_dir(dx, dy, dz);
        res = doapply();
    } else if (is(a, "attack") || is(a, "move")) {
        /* dx == dy == 0: nothing to attack or move to */
        res = 0;
    }

    wh_queue_keys("");
    presel_clear();
    return res;
}
