/* WebHack player interaction: engine-side resolution and execution
 * (collvey/WebHack-Steam#35).
 *
 * The client never guesses game state. Each time the engine waits for a
 * command it sends an INTERACT event built by wh_interact_json(): what is
 * underfoot, what every target around the hero allows, and the default
 * target/action. When the player picks a target and an action, the client
 * sends an ACTION; the port hands it to wh_action_set_json() and returns a
 * click with mod WH_CLICK_ACTION, which click_to_cmd() turns into the hidden
 * command dowhaction(). That command pre-selects the chosen objects and
 * directions and calls the ordinary command function, whose prompts consult
 * the pre-selection instead of asking. With nothing pre-selected every
 * helper below behaves exactly like the prompt it replaces.
 */
#ifndef WHINTERACT_H
#define WHINTERACT_H

#define WH_CLICK_ACTION 77      /* nh_poskey() mod value for an ACTION */
#define WH_ACTION_KEY (0x80 | '_') /* M('_'): key of the hidden #whaction command */
#define WH_FINGERS_ID 0xFFFFFFFFU /* "your fingers" for engraving */

/* INTERACT payload; caller frees the returned buffer. */
extern char *NDECL(wh_interact_json);

/* Store a pending ACTION (raw JSON from the client). */
extern void FDECL(wh_action_set_json, (const char *));
/* click_to_cmd() hook: command string for the pending action. */
extern const char *NDECL(wh_action_cmd);
/* The hidden command that executes the pending action. */
extern int NDECL(dowhaction);
/* LOOKAT: the far-look text of a map square, as JSON (caller frees). */
extern char *FDECL(wh_lookat_json, (const char *));
/* pager.c: the name of what is shown at <x,y> */
extern struct permonst *FDECL(lookat, (int, int, char *, char *));

/* cmd.c: replace the pending key queue (directions for prompts). */
extern void FDECL(wh_queue_keys, (const char *));

/* Pre-selection consulted by the prompts. */
extern boolean NDECL(wh_presel_active);
extern boolean FDECL(wh_presel_is, (struct obj *));
extern struct obj *FDECL(wh_presel_invent, (const char *));
extern char FDECL(wh_presel_ynq, (struct obj *, const char *, int));
extern char FDECL(wh_presel_yn_terrain, (const char *));
extern boolean NDECL(wh_presel_trap_only);
extern boolean FDECL(wh_presel_spell, (int *));
extern int FDECL(wh_presel_menu, (struct obj **, int));
extern char NDECL(wh_presel_hand);
extern boolean FDECL(wh_presel_act, (const char *));
extern boolean FDECL(wh_presel_pos, (coord *));
/* do_name.c: name the monster at the chosen square */
extern void NDECL(do_mname);

#endif /* WHINTERACT_H */
