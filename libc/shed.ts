import { libc } from "./_libc.ts";
import { encoder, throwForLastErrorIf } from "./_utils.ts";

// CLONE FLAGS:  https://github.com/torvalds/linux/blob/5bfc75d92efd494db37f5c4c173d3639d4772966/include/uapi/linux/sched.h
export const CSIGNAL = 0x000000ff; /* signal mask to be sent at exit */
export const CLONE_VM = 0x00000100; /* set if VM shared between processes */
export const CLONE_FS = 0x00000200; /* set if fs info shared between processes */
export const CLONE_FILES = 0x00000400; /* set if open files shared between processes */
export const CLONE_SIGHAND = 0x00000800; /* set if signal handlers and blocked signals shared */
export const CLONE_PIDFD = 0x00001000; /* set if a pidfd should be placed in parent */
export const CLONE_PTRACE = 0x00002000; /* set if we want to let tracing continue on the child too */
export const CLONE_VFORK = 0x00004000; /* set if the parent wants the child to wake it up on mm_release */
export const CLONE_PARENT = 0x00008000; /* set if we want to have the same parent as the cloner */
export const CLONE_THREAD = 0x00010000; /* Same thread group? */
export const CLONE_NEWNS = 0x00020000; /* New mount namespace group */
export const CLONE_SYSVSEM = 0x00040000; /* share system V SEM_UNDO semantics */
export const CLONE_SETTLS = 0x00080000; /* create a new TLS for the child */
export const CLONE_PARENT_SETTID = 0x00100000; /* set the TID in the parent */
export const CLONE_CHILD_CLEARTID = 0x00200000; /* clear the TID in the child */
export const CLONE_DETACHED = 0x00400000; /* Unused, ignored */
export const CLONE_UNTRACED = 0x00800000; /* set if the tracing process can't force CLONE_PTRACE on this clone */
export const CLONE_CHILD_SETTID = 0x01000000; /* set the TID in the child */
export const CLONE_NEWCGROUP = 0x02000000; /* New cgroup namespace */
export const CLONE_NEWUTS = 0x04000000; /* New utsname namespace */
export const CLONE_NEWIPC = 0x08000000; /* New ipc namespace */
export const CLONE_NEWUSER = 0x10000000; /* New user namespace */
export const CLONE_NEWPID = 0x20000000; /* New pid namespace */
export const CLONE_NEWNET = 0x40000000; /* New network namespace */
export const CLONE_IO = 0x80000000; /* Clone io context */

/*
 * cloning flags intersect with CSIGNAL so can be used with unshare and clone3
 * syscalls only:
 */
export const CLONE_NEWTIME = 0x00000080; /* New time namespace */

export const unshare = (flags: number): void => {
  const result = libc.symbols.unshare(flags) as number;
  throwForLastErrorIf(result);
};

export const pivotRoot = (newRoot: string, putOld: string): void => {
  const newRootArray = encoder.encode(`${newRoot}\0`);
  const putOldArray = encoder.encode(`${putOld}\0`);
  const result = libc.symbols.pivot_root(newRootArray, putOldArray) as number;
  throwForLastErrorIf(result);
};
