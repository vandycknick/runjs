export const libc = Deno.dlopen("libc.so.6", {
  unshare: {
    parameters: ["i32"],
    result: "i32",
  },
  pivot_root: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
  sethostname: {
    parameters: ["pointer", "usize"],
    result: "i32",
  },
  mount: {
    parameters: ["pointer", "pointer", "pointer", "u64", "pointer"],
    result: "i32",
  },
  umount2: {
    parameters: ["pointer", "i32"],
    result: "i32",
  },
  execve: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "i32",
  },
  // https://github.com/bminor/glibc/blob/6b0978c14acc2a6b5f5dbd8e8ef75fddc6656483/csu/errno-loc.c
  // https://github.com/bminor/musl/blob/98e688a9da5e7b2925dda17a2d6820dddf1fb287/src/errno/__errno_location.c
  __errno_location: {
    parameters: [],
    result: "pointer",
  },
  strerror: {
    parameters: ["i32"],
    result: "pointer",
  },
});

// CLONE FLAGS:  https://github.com/torvalds/linux/blob/5bfc75d92efd494db37f5c4c173d3639d4772966/include/uapi/linux/sched.h
export const CLONE_NEWNS = 0x00020000; // New mount namespace group
export const CLONE_NEWPID = 0x20000000;
export const CLONE_NEWUTS = 0x04000000;

// Mount flags: https://github.com/torvalds/linux/blob/e55f0c439a2681a3c299bedd99ebe998049fa508/include/uapi/linux/mount.h
export const MS_RDONLY = 1; /* Mount read-only */
export const MS_NOSUID = 2; /* Ignore suid and sgid bits */
export const MS_NODEV = 4; /* Disallow access to device special files */
export const MS_NOEXEC = 8; /* Disallow program execution */
export const MS_SYNCHRONOUS = 16; /* Writes are synced at once */
export const MS_REMOUNT = 32; /* Alter flags of a mounted FS */
export const MS_MANDLOCK = 64; /* Allow mandatory locks on an FS */
export const MS_DIRSYNC = 128; /* Directory modifications are synchronous */
export const MS_NOSYMFOLLOW = 256; /* Do not follow symlinks */
export const MS_NOATIME = 1024; /* Do not update access times. */
export const MS_NODIRATIME = 2048; /* Do not update directory access times */
export const MS_BIND = 4096;
export const MS_MOVE = 8192;
export const MS_REC = 16384;
export const MS_VERBOSE = 32768; /* War is peace. Verbosity is silence. MS_VERBOSE is deprecated. */
export const MS_SILENT = 32768;
export const MS_POSIXACL = 1 << 16; /* VFS does not apply the umask */
export const MS_UNBINDABLE = 1 << 17; /* change to unbindable */
export const MS_PRIVATE = 1 << 18; /* change to private */
export const MS_SLAVE = 1 << 19; /* change to slave */
export const MS_SHARED = 1 << 20; /* change to shared */
export const MS_RELATIME = 1 << 21; /* Update atime relative to mtime/ctime. */
export const MS_KERNMOUNT = 1 << 22; /* this is a kern_mount call */
export const MS_I_VERSION = 1 << 23; /* Update inode I_version field */
export const MS_STRICTATIME = 1 << 24; /* Always perform atime updates */
export const MS_LAZYTIME = 1 << 25; /* Update the on-disk [acm]times lazily */

/*
 * Old magic mount flag and mask
 */
export const MS_MGC_VAL = 0xc0ed0000;
export const MS_MGC_MSK = 0xffff0000;

// Umount flags: https://github.com/torvalds/linux/blob/b501b85957deb17f1fe0a861fee820255519d526/include/linux/fs.h
export const MNT_FORCE = 0x00000001;
export const MNT_DETACH = 0x00000002; //Just detach from the tree

// API
const encoder = new TextEncoder();

export const unshare = (flags: number): void => {
  const result = libc.symbols.unshare(flags);

  if (result == -1)
    throw new Error(`Failed unsharing resources for flags: ${flags}`);
};

export const pivotRoot = (newRoot: string, putOld: string): void => {
  const newRootArray = encoder.encode(`${newRoot}\0`);
  const putOldArray = encoder.encode(`${putOld}\0`);
  const result = libc.symbols.pivot_root(newRootArray, putOldArray);

  if (result == -1) throw new Error(`Unable to pivot into ${newRoot}`);
};

export const getHostname = () => Deno.hostname();

export const setHostname = (name: string): void => {
  const pointer = encoder.encode(name);
  const result = libc.symbols.sethostname(pointer, name.length);

  if (result === -1) throw new Error(`Unable to set hostname to ${name}`);
};

export const mount = (
  source: string,
  target: string,
  fileSystemType: string | null,
  mountFlags: number,
  data: string | null
): void => {
  const pSource = encoder.encode(`${source}\0`);
  const pTarget = encoder.encode(`${target}\0`);
  const pFileSystemType =
    fileSystemType !== null ? encoder.encode(`${fileSystemType}\0`) : null;
  const pData = data !== null ? encoder.encode(`${data}\0`) : null;

  const result = libc.symbols.mount(
    pSource,
    pTarget,
    pFileSystemType,
    // Ensure mountFlags is an unsigned long at all times
    mountFlags >>> 0,
    pData
  );

  if (result === -1) {
    const err = errno();
    const message = strerror(err);
    throw new Error(`[${err}] Failed to mount: ${message}`);
  }
};

export const umount = (target: string, flags?: number): void => {
  const pTarget = encoder.encode(`${target}\0`);

  const result = libc.symbols.umount2(pTarget, flags ?? 0);
  throwForLastErrorIf(result as number);
};

export const exec = (
  file: string,
  args: string[],
  env?: { [key: string]: string }
): void => {
  const pFile = encoder.encode(`${file}\0`);

  const pArgs = args.map((a) => {
    const argBuffer = encoder.encode(`${a}\0`);
    const pArg = Deno.UnsafePointer.of(argBuffer);
    return pArg;
  });

  const ppArg = BigUint64Array.from(pArgs.map((p) => p.value));
  const nullByte = new BigUint64Array([0n]);
  const pArgsWithNullByte = new BigUint64Array(ppArg.length + nullByte.length);

  pArgsWithNullByte.set(ppArg);
  pArgsWithNullByte.set(nullByte, ppArg.length);

  const envVars = env ?? Deno.env.toObject();
  const pEnv = Object.keys(envVars).map((key) => {
    const envBuffer = encoder.encode(`${key}=${envVars[key]}\0`);
    const pEnvVar = Deno.UnsafePointer.of(envBuffer);
    return pEnvVar;
  });
  const pEnvWithNullByte = new BigUint64Array(pEnv.length + nullByte.length);
  pEnvWithNullByte.set(BigUint64Array.from(pEnv.map((p) => p.value)));
  pEnvWithNullByte.set(nullByte, pEnv.length);

  const result = libc.symbols.execve(
    pFile,
    pArgsWithNullByte,
    pEnvWithNullByte
  );

  throwForLastErrorIf(result as number);
};

export const errno = (): number => {
  const pErrno = libc.symbols.__errno_location() as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pErrno);
  return view.getInt32();
};

export const strerror = (errno: number): string => {
  const pErrorMessage = libc.symbols.strerror(errno) as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pErrorMessage);
  return view.getCString();
};

const throwForLastErrorIf = (retVal: number) => {
  if (retVal !== -1) return;

  const err = errno();
  const message = strerror(err);
  throw new Error(`[${err}] ${message}`);
};
