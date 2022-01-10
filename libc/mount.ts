import { libc } from "./_libc.ts";
import { throwForLastErrorIf } from "./_helpers.ts";

const encoder = new TextEncoder();

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
// Old magic mount flag and mask
export const MS_MGC_VAL = 0xc0ed0000;
export const MS_MGC_MSK = 0xffff0000;

// Umount flags: https://github.com/torvalds/linux/blob/b501b85957deb17f1fe0a861fee820255519d526/include/linux/fs.h
export const MNT_FORCE = 0x00000001;
export const MNT_DETACH = 0x00000002; //Just detach from the tree

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
  ) as number;

  throwForLastErrorIf(result);
};

export const umount = (target: string, flags?: number): void => {
  const pTarget = encoder.encode(`${target}\0`);

  const result = libc.symbols.umount2(pTarget, flags ?? 0);
  throwForLastErrorIf(result as number);
};
