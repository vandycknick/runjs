import { printf } from "https://deno.land/std@0.120.0/fmt/printf.ts";

import {
  cap_get_proc,
  cap_free,
  cap_to_text,
  cap_to_name,
  cap_get_bound,
  cap_get_ambient,
} from "../libcap/mod.ts";

const libc = Deno.dlopen("libc.so.6", {
  prctl: {
    parameters: ["i32", "u64", "u64", "u64", "u64"],
    result: "i32",
  },
});

const all = cap_get_proc();

const current = cap_to_text(all);
console.log(`Current: ${current}`);

let bounding = "";
let set = 0;
for (let cap = 0; (set = cap_get_bound(cap)) >= 0; cap++) {
  if (!set) continue;

  const name = cap_to_name(cap);
  bounding = `${bounding}${name},`;
}

console.log(`Bounding set = ${bounding.slice(0, -1)}`);

let ambient = "";
set = 0;
for (let cap = 0; (set = cap_get_ambient(cap)) >= 0; cap++) {
  if (!set) continue;

  const name = cap_to_name(cap);
  ambient = `${ambient}${name},`;
}

console.log(`Ambient set = ${ambient.slice(0, -1)}`);

if (cap_free(all) != 0) {
  throw new Error("Can't free up cap_t ref");
}

const PR_GET_SECUREBITS = 27; // https://github.com/torvalds/linux/blob/5147da902e0dd162c6254a61e4c57f21b60a9b1c/include/uapi/linux/prctl.h#L81
set = libc.symbols.prctl(PR_GET_SECUREBITS, 0, 0, 0, 0) as number;

const binary = (n: number): string => (n >>> 0).toString(2);

// https://github.com/torvalds/linux/blob/df0cc57e057f18e44dac8e6c18aba47ab53202f9/include/uapi/linux/securebits.h
const issecureMask = (x: number) => 1 << x;

const SECURE_NOROOT = 0;
const SECURE_NOROOT_LOCKED = 1; /* make bit-0 immutable */

const SECBIT_NOROOT = issecureMask(SECURE_NOROOT);
const SECBIT_NOROOT_LOCKED = issecureMask(SECURE_NOROOT_LOCKED);

const SECURE_NO_SETUID_FIXUP = 2;
const SECURE_NO_SETUID_FIXUP_LOCKED = 3; /* make bit-2 immutable */

const SECBIT_NO_SETUID_FIXUP = issecureMask(SECURE_NO_SETUID_FIXUP);
const SECBIT_NO_SETUID_FIXUP_LOCKED = issecureMask(
  SECURE_NO_SETUID_FIXUP_LOCKED
);

const SECURE_KEEP_CAPS = 4;
const SECURE_KEEP_CAPS_LOCKED = 5; /* make bit-4 immutable */

const SECBIT_KEEP_CAPS = issecureMask(SECURE_KEEP_CAPS);
const SECBIT_KEEP_CAPS_LOCKED = issecureMask(SECURE_KEEP_CAPS_LOCKED);

/* When set, a process cannot add new capabilities to its ambient set. */
const SECURE_NO_CAP_AMBIENT_RAISE = 6;
const SECURE_NO_CAP_AMBIENT_RAISE_LOCKED = 7; /* make bit-6 immutable */

const SECBIT_NO_CAP_AMBIENT_RAISE = issecureMask(SECURE_NO_CAP_AMBIENT_RAISE);
const SECBIT_NO_CAP_AMBIENT_RAISE_LOCKED = issecureMask(
  SECURE_NO_CAP_AMBIENT_RAISE_LOCKED
);

const SECURE_ALL_BITS =
  issecureMask(SECURE_NOROOT) |
  issecureMask(SECURE_NO_SETUID_FIXUP) |
  issecureMask(SECURE_KEEP_CAPS) |
  issecureMask(SECURE_NO_CAP_AMBIENT_RAISE);
const SECURE_ALL_LOCKS = SECURE_ALL_BITS << 1;

const b = binary(set);
printf("Securebits: 0%o/0x%x/%v'b%b\n", set, set, b.length >>> 0, set);

printf(
  " secure-noroot: %s (%s)\n",
  set & SECBIT_NOROOT ? "yes" : "no",
  set & SECBIT_NOROOT_LOCKED ? "locked" : "unlocked"
);
printf(
  " secure-no-suid-fixup: %s (%s)\n",
  set & SECBIT_NO_SETUID_FIXUP ? "yes" : "no",
  set & SECBIT_NO_SETUID_FIXUP_LOCKED ? "locked" : "unlocked"
);
printf(
  " secure-keep-caps: %s (%s)\n",
  set & SECBIT_KEEP_CAPS ? "yes" : "no",
  set & SECBIT_KEEP_CAPS_LOCKED ? "locked" : "unlocked"
);

const CAP_CHOWN = 0;
const CAP_AMBIENT_SUPPORTED = () => cap_get_ambient(CAP_CHOWN) >= 0;

if (CAP_AMBIENT_SUPPORTED()) {
  printf(
    " secure-no-ambient-raise: %s (%s)\n",
    set & SECBIT_NO_CAP_AMBIENT_RAISE ? "yes" : "no",
    set & SECBIT_NO_CAP_AMBIENT_RAISE_LOCKED ? "locked" : "unlocked"
  );
}
