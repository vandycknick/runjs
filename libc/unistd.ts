import { isAbsolute, join } from "https://deno.land/std@0.121.0/path/mod.ts";

import { libc } from "./_libc.ts";
import { throwForLastErrorIf, encoder, exists } from "./_utils.ts";

export const STDIN_FILENO = 0;
export const STDOUT_FILENO = 1;
export const STDERR_FILENO = 2;

export const SEEK_SET = 0;
export const SEEK_CUR = 1;
export const SEEK_END = 2;

export const getuid = () => libc.symbols.getuid() as number;
export const geteuid = () => libc.symbols.geteuid() as number;
export const getgid = () => libc.symbols.getgid() as number;
export const getegid = () => libc.symbols.getegid() as number;

export const getHostname = () => Deno.hostname();

export const setHostname = (name: string): void => {
  const pointer = encoder.encode(name);
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

export const fork = () => libc.symbols.fork() as number;

export const exec = (
  fileName: string,
  args: string[],
  env?: { [key: string]: string }
): void => {
  const file = resolvePath(fileName);

  if (file == null)
    throw new Deno.errors.NotFound(`No such file or directory ${fileName}`);

  const pFile = encoder.encode(`${file}\0`);

  const pArgs = [fileName, ...args].map((a) => {
    const argBuffer = encoder.encode(`${a}\0`);
    const pArg = Deno.UnsafePointer.of(argBuffer);
    return pArg;
  });

  const ppArg = BigUint64Array.from(pArgs.map((p) => p.value));
  const nullByte = new BigUint64Array([0n]);
  const pArgsWithNullByte = new BigUint64Array(ppArg.length + nullByte.length);

  pArgsWithNullByte.set(ppArg);
  pArgsWithNullByte.set(nullByte, ppArg.length);

  const envVars = env ?? Deno.env.toObject();
  const pEnv = Object.keys(envVars).map((key) => {
    const envBuffer = encoder.encode(`${key}=${envVars[key]}\0`);
    const pEnvVar = Deno.UnsafePointer.of(envBuffer);
    return pEnvVar;
  });
  const pEnvWithNullByte = new BigUint64Array(pEnv.length + nullByte.length);
  pEnvWithNullByte.set(BigUint64Array.from(pEnv.map((p) => p.value)));
  pEnvWithNullByte.set(nullByte, pEnv.length);

  const result = libc.symbols.execve(
    pFile,
    pArgsWithNullByte,
    pEnvWithNullByte
  ) as number;

  // Execve should never return on success on error -1 is returned, and errno is set appropriately.
  throwForLastErrorIf(result);
};
