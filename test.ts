import { ERANGE } from "./libc/errno.ts";
import { strerror, _strerrorUnsafe } from "./libc/string.ts";
import { exec } from "./libc/unistd.ts";

const msg = strerror(ERANGE);

console.log(msg);

console.log(_strerrorUnsafe(ERANGE));

exec("lsz", ["-al"]);
