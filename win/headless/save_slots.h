/* NetHack Save Slot Management for WASM - Header */

#ifndef SAVE_SLOTS_H
#define SAVE_SLOTS_H

#ifdef __EMSCRIPTEN__

/* Initialize save slots directory */
int init_save_slots(void);

/* Save current game to a slot (without exiting) */
int save_to_slot(int slot_num);

/* Load game from a slot (will reload page) */
int load_from_slot(int slot_num);

/* List all save slots (returns JSON) */
const char* list_save_slots(void);

/* Delete a save slot */
int delete_save_slot(int slot_num);

#endif /* __EMSCRIPTEN__ */

#endif /* SAVE_SLOTS_H */
