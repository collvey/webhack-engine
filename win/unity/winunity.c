/* winunity.c - Unity window port scaffolding (M0)
 * This file will implement the NetHack window_procs for the Unity UI.
 * For M0, we keep it minimal to confirm the build/link pipeline later.
 */

#include "config.h"         /* if available in build context */
#include "winunity.h"

/* Forward declaration: in later milestones, define the full window_procs table
   per include/winprocs.h. For now, provide a placeholder symbol so that
   the port can be referenced conditionally without link errors. */

#ifdef __GNUC__
__attribute__((visibility("default")))
#endif
void unity_port_placeholder(void) {
    /* Placeholder to ensure object is not empty. */
}
