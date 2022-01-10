import { parse } from "https://deno.land/std@0.121.0/flags/mod.ts";

const NAME = "runjs";
const VERSION = "1.0.0";

const run = (args: string[]) => {
  console.log("run", args);
  return 0;
};

const main = (args: string[]) => {
  try {
    if (args.length === 0) {
      throw new Error(`"${NAME}" requires at least 1 argument`);
    }

    const parsed = parse(args, {
      boolean: ["help", "version"],
      alias: { h: "help", v: "version" },
    });

    if (parsed.help) {
      console.log(
        `${NAME} ${VERSION}\n` +
          `Mini container runtime written in TypeScript\n\n` +
          `USAGE:\n` +
          `     ${NAME} <binary> <args>...\n\n` +
          `OPTIONS:\n` +
          `     -h, --help\n` +
          `         Prints help information\n` +
          `     -v, --version\n` +
          `         Prints version information`
      );
      return 0;
    }

    if (parsed.version) {
      console.log(VERSION);
      return 0;
    }

    const status = run(args);
    return status;
  } catch (ex) {
    console.log(
      `\x1b[31merror\x1b[0m: ${ex.message}\n\n` +
        `USAGE:\n` +
        `     ${NAME} <binary> <args>... \n\n` +
        `For more information try --help`
    );
    return 1;
  }
};

const result = main(Deno.args);
Deno.exit(result);
