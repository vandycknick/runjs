import { libc } from "./_libc.ts";
import { ERANGE } from "./errno.ts";

export const _strerrorUnsafe = (err: number): string => {
  const pErrorMessage = libc.symbols.strerror(err) as Deno.UnsafePointer;
  const view = new Deno.UnsafePointerView(pErrorMessage);
  return view.getCString();
};

export const strerror = (err: number): string => {
  let buffer = new Uint8Array(256);
  let result = 0;

  while (
    (result = libc.symbols.__xpg_strerror_r(
      err,
      buffer,
      buffer.length
    ) as number) !== 0 &&
    result === ERANGE
  ) {
    buffer = new Uint8Array(buffer.length * 2);
  }

  if (result !== 0) {
    throw new Error(`Failed to cast errno to string got: ${result}`);
  }

  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
};
