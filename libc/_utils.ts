import { errno, EINTR } from "./errno.ts";
import { strerror } from "./string.ts";

export const encoder = new TextEncoder();

export const shouldRetrySyscall = (result: number) => {
  if (result == -1 && errno() == EINTR) {
    return true;
  }

  return false;
};

export const throwForLastError = () => {
  const err = errno();
  const message = strerror(err);
  throw new Error(`[${err}] ${message}`);
};

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
