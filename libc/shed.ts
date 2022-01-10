import { libc } from "./_libc.ts";
import { encoder, throwForLastErrorIf } from "./_helpers.ts";

// CLONE FLAGS:  https://github.com/torvalds/linux/blob/5bfc75d92efd494db37f5c4c173d3639d4772966/include/uapi/linux/sched.h
export const CLONE_NEWNS = 0x00020000; // New mount namespace group
export const CLONE_NEWPID = 0x20000000;
export const CLONE_NEWUTS = 0x04000000;

export const unshare = (flags: number): void => {
  const result = libc.symbols.unshare(flags);

  if (result == -1)
    throw new Error(`Failed unsharing resources for flags: ${flags}`);
};

export const pivotRoot = (newRoot: string, putOld: string): void => {
  const newRootArray = encoder.encode(`${newRoot}\0`);
  const putOldArray = encoder.encode(`${putOld}\0`);
  const result = libc.symbols.pivot_root(newRootArray, putOldArray) as number;
  throwForLastErrorIf(result);
};
