const libc = Deno.dlopen("libc.so.6", {
  getuid: {
    parameters: [],
    result: "i32",
  },
  getpwuid: {
    parameters: ["i32"],
    result: "pointer",
  },
});

const getpwuid = () => {
  const uid = libc.symbols.getuid() as number;

  const pPasswd = libc.symbols.getpwuid(uid) as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pPasswd);

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

  console.log(pwName);
  console.log(pwPasswd);
  console.log(pwUid);
  console.log(pwGid);
  console.log(pwGecos);
  console.log(pwDir);
  console.log(pwShell);

  return {
    name: pwName,
    password: pwPasswd,
    uuid: pwUid,
    gid: pwGid,
    userInformation: pwGecos,
    homeDirectory: pwDir,
    shell: pwShell,
  };
};

const result = getpwuid();

console.log(result);
