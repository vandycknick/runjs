export const libc = Deno.dlopen("libc.so.6", {
  // #include <unistd.h>
  getuid: {
    parameters: [],
    result: "i32",
  },
  geteuid: {
    parameters: [],
    result: "i32",
  },
  getgid: {
    parameters: [],
    result: "i32",
  },
  getegid: {
    parameters: [],
    result: "i32",
  },
  sethostname: {
    parameters: ["pointer", "usize"],
    result: "i32",
  },
  execve: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "i32",
  },

  // #include <shed.h>
  unshare: {
    parameters: ["i32"],
    result: "i32",
  },

  // Technically there's no wrapper in libc for pivot_root, but glibc is so friendly that does provide one
  pivot_root: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },

  // #include <sys/mount.h>
  mount: {
    parameters: ["pointer", "pointer", "pointer", "u64", "pointer"],
    result: "i32",
  },
  umount2: {
    parameters: ["pointer", "i32"],
    result: "i32",
  },

  // #include <pw.h>
  getpwnam: {
    parameters: ["pointer"],
    result: "pointer",
  },
  getpwuid: {
    parameters: ["i32"],
    result: "pointer",
  },

  // #include <string.h>
  strerror: {
    parameters: ["i32"],
    result: "pointer",
  },

  __xpg_strerror_r: {
    parameters: ["i32", "pointer", "usize"],
    result: "i32",
  },

  // int strerror_r(int errnum, char *buf, size_t buflen);

  // Private pointer to a function in libc to get static errno value, what can possible go wrong
  // https://github.com/bminor/glibc/blob/6b0978c14acc2a6b5f5dbd8e8ef75fddc6656483/csu/errno-loc.c
  // https://github.com/bminor/musl/blob/98e688a9da5e7b2925dda17a2d6820dddf1fb287/src/errno/__errno_location.c
  __errno_location: {
    parameters: [],
    result: "pointer",
  },
});
