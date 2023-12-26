import { isAbsolute, join } from "https://deno.land/std@0.121.0/path/mod.ts";

import { libc } from "./_libc.ts";
import { encoder, exists, throwForLastErrorIf } from "./_utils.ts";

export const STDIN_FILENO = 0;
export const STDOUT_FILENO = 1;
export const STDERR_FILENO = 2;

export const SEEK_SET = 0;
export const SEEK_CUR = 1;
export const SEEK_END = 2;

export const getuid = () => libc.symbols.getuid();
export const geteuid = () => libc.symbols.geteuid();
export const getgid = () => libc.symbols.getgid();
export const getegid = () => libc.symbols.getegid();

export const getHostname = () => Deno.hostname();

export const setHostname = (name: string): void => {
  const buffer = encoder.encode(name);
  const pointer = Deno.UnsafePointer.of(buffer);
  const result = libc.symbols.sethostname(pointer, name.length) as number;
  throwForLastErrorIf(result);
};

const findProgramInPath = (fileName: string): string | null => {
  const path = Deno.env.get("PATH");

  if (path == null) return null;

  for (const searchPath of path.split(":")) {
    const fullPath = join(searchPath, fileName);
    if (exists(fullPath)) return fullPath;
  }

  return null;
};

const resolvePath = (fileName: string): string | null => {
  if (isAbsolute(fileName)) return fileName;

  const path = join(Deno.cwd(), fileName);
  if (exists(path)) return path;
  return findProgramInPath(fileName);
};

export const fork = () => libc.symbols.fork();

export const exec = (
  fileName: string,
  args: string[],
  env?: { [key: string]: string },
): void => {
  const file = resolvePath(fileName);

  if (file == null) {
    throw new Deno.errors.NotFound(`No such file or directory ${fileName}!`);
  }

  const pFile = encoder.encode(`${file}\0`);

  const pArgs = [fileName, ...args].map((a) => {
    const argBuffer = encoder.encode(`${a}\0`);
    const pArg = Deno.UnsafePointer.of(argBuffer);
    return pArg;
  });
  const pArgsWithNullByte = BigUint64Array.from(
    [...pArgs, null].map((p) =>
      p != null ? BigInt(Deno.UnsafePointer.value(p)) : 0n
    ),
  );

  const envVars = env ?? Deno.env.toObject();
  const pEnv = Object.keys(envVars).map((key) => {
    const envBuffer = encoder.encode(`${key}=${envVars[key]}\0`);
    return Deno.UnsafePointer.of(envBuffer);
  });

  const pEnvWithNullByte = BigUint64Array.from(
    [...pEnv, null].map((p) =>
      p != null ? BigInt(Deno.UnsafePointer.value(p)) : 0n
    ),
  );

  const result = libc.symbols.execve(
    Deno.UnsafePointer.of(pFile),
    Deno.UnsafePointer.of(pArgsWithNullByte),
    Deno.UnsafePointer.of(pEnvWithNullByte),
  );

  // Execve should never return on success on error -1 is returned, and errno is set appropriately.
  throwForLastErrorIf(result);
};
