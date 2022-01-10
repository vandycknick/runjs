import { libc } from "./_libc.ts";

const encoder = new TextEncoder();

export const getpwnam = (name: string) => {
  const buffer = encoder.encode(name);
  const pointer = libc.symbols.getpwnam(buffer) as Deno.UnsafePointer;

  if (pointer.value === 0n) return null;
  return parsePasswdStruct(pointer);
};

export const getpwuid = (uid: number) => {
  const pointer = libc.symbols.getpwuid(uid) as Deno.UnsafePointer;

  if (pointer.value === 0n) return null;
  return parsePasswdStruct(pointer);
};

const parsePasswdStruct = (pointer: Deno.UnsafePointer) => {
  const view = new Deno.UnsafePointerView(pointer);
  const pwName = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(view.getBigUint64())
  ).getCString();

  const pwPasswd = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(view.getBigUint64(8))
  ).getCString();

  const pwUid = view.getInt32(16);
  const pwGid = view.getInt32(20);

  const pwGecos = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(view.getBigUint64(24))
  ).getCString();

  const pwDir = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(view.getBigUint64(32))
  ).getCString();

  const pwShell = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(view.getBigUint64(40))
  ).getCString();

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
