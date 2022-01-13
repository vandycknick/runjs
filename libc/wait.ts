import { libc } from "./_libc.ts";
import { throwForLastError } from "./_utils.ts";
import { errno, EINTR } from "./errno.ts";

export const wait = () => libc.symbols.wait(null) as number;

export const waitPid = (pid: number) => {
  const buffer = new Int32Array(1);
  let rpid = 0;

  do {
    rpid = libc.symbols.waitpid(pid, buffer, 0) as number;
  } while (rpid == -1 && errno() == EINTR);

  if (pid != rpid) throwForLastError();

  const status = buffer[0];
  const code = getExitCode(status);

  return {
    pid,
    code,
  };
};

const WEXITSTATUS = (status: number) => (status & 0xff00) >> 8;

const WIFEXITED = (status: number) => WTERMSIG(status) == 0;

const WIFSIGNALED = (status: number) => ((status & 0x7f) + 1) >> 1 > 0;

const WTERMSIG = (status: number) => status & 0x7f;

const getExitCode = (status: number) => {
  if (WIFEXITED(status)) {
    return WEXITSTATUS(status);
  } else if (WIFSIGNALED(status)) {
    return 128 + WTERMSIG(status);
  } else {
    return -1;
  }
};
