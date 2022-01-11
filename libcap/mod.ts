const libcap = Deno.dlopen("libcap.so.2", {
  cap_get_proc: {
    parameters: [],
    result: "pointer",
  },
  cap_to_text: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
  },
  cap_to_name: {
    parameters: ["i32"],
    result: "pointer",
  },
  cap_free: {
    parameters: ["pointer"],
    result: "i32",
  },
  cap_get_bound: {
    parameters: ["i32"],
    result: "i32",
  },
  cap_get_ambient: {
    parameters: ["i32"],
    result: "i32",
  },
});

type cap_t = Deno.UnsafePointer;
type cap_value_t = number;

export const cap_get_proc = () => libcap.symbols.cap_get_proc() as cap_t;

export const cap_free = (pointer: Deno.UnsafePointer) =>
  libcap.symbols.cap_free(pointer) as number;

export const cap_get_bound = (value: cap_value_t): number =>
  libcap.symbols.cap_get_bound(value) as number;

export const cap_get_ambient = (value: cap_value_t): number =>
  libcap.symbols.cap_get_ambient(value) as number;

export const cap_to_name = (value: cap_value_t): string => {
  const pointer = libcap.symbols.cap_to_name(value) as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pointer);
  const name = view.getCString();

  if (cap_free(pointer) !== 0) {
    throw new Error("Failed freeing up cap name pointer");
  }

  return name;
};

export const cap_to_text = (cap: cap_t): string => {
  const pointer = libcap.symbols.cap_to_text(cap, null) as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pointer);
  const text = view.getCString();

  if (cap_free(pointer) !== 0) {
    throw new Error("Failed freeing up cap text pointer");
  }

  return text;
};
