import { libc } from "./_libc.ts";

const encoder = new TextEncoder();

export const getpwnam = (name: string) => {
  const buffer = encoder.encode(name);
  const pointer = libc.symbols.getpwnam(Deno.UnsafePointer.of(buffer));
  return parsePasswdStruct(pointer);
};

export const getpwuid = (uid: number) => {
  const pointer = libc.symbols.getpwuid(uid);
  return parsePasswdStruct(pointer);
};

const parsePasswdStruct = (pointer: Deno.PointerValue<unknown>) => {
  if (pointer === null) return null;

  const view = new Deno.UnsafePointerView(pointer);
  const pwNamePtr = view.getPointer();
  const pwName = pwNamePtr !== null
    ? new Deno.UnsafePointerView(pwNamePtr).getCString()
    : "";

  const pwPasswdPtr = view.getPointer(8);
  const pwPasswd = pwPasswdPtr !== null
    ? new Deno.UnsafePointerView(pwPasswdPtr).getCString()
    : "";

  const pwUid = view.getInt32(16);
  const pwGid = view.getInt32(20);

  const pwGecosPtr = view.getPointer(24);
  const pwGecos = pwGecosPtr !== null
    ? new Deno.UnsafePointerView(pwGecosPtr).getCString()
    : "";

  const pwDirPtr = view.getPointer(32);
  const pwDir = pwDirPtr !== null
    ? new Deno.UnsafePointerView(pwDirPtr).getCString()
    : "";

  const pwShellPtr = view.getPointer(40);
  const pwShell = pwShellPtr !== null
    ? new Deno.UnsafePointerView(pwShellPtr).getCString()
    : "";

  return {
    name: pwName,
    password: pwPasswd,
    uid: pwUid,
    gid: pwGid,
    gecos: pwGecos,
    dir: pwDir,
    shell: pwShell,
  };
};
