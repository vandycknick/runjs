const libcap = Deno.dlopen("libcap.so.2", {
  cap_get_proc: {
    parameters: [],
    result: "i64",
  },
});

const r = libcap.symbols.cap_get_proc() as number;

console.log(r);
