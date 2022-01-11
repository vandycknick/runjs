import { errno } from "./errno.ts";
import { strerror } from "./string.ts";

export const encoder = new TextEncoder();

export const throwForLastErrorIf = (retVal: number) => {
  if (retVal !== -1) return;

  const err = errno();
  const message = strerror(err);
  throw new Error(`[${err}] ${message}`);
};

export const exists = (filePath: string): boolean => {
  try {
    Deno.lstatSync(filePath);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
};
