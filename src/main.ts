import { parse } from "https://deno.land/std@0.121.0/flags/mod.ts";

import {
  CLONE_NEWIPC,
  CLONE_NEWNS,
  CLONE_NEWPID,
  CLONE_NEWUTS,
  exec,
  fork,
  waitPid,
  MNT_DETACH,
  MNT_FORCE,
  mount,
  MS_BIND,
  MS_MGC_VAL,
  MS_NODEV,
  MS_NOEXEC,
  MS_NOSUID,
  MS_PRIVATE,
  MS_RDONLY,
  MS_REC,
  MS_RELATIME,
  pivotRoot,
  setHostname,
  umount,
  unshare,
} from "../libc/mod.ts";

const NAME = "runjs";
const VERSION = "1.0.0";
const LIB_ROOT = `/var/lib/${NAME}`;

const getHostNameFromContainerId = (containerId: string) =>
  containerId.split("-").join("").substring(0, 13);

const run = (args: string[]) => {
  const containerId = crypto.randomUUID();

  // Ensure libroot exists
  Deno.mkdirSync(LIB_ROOT, { recursive: true });

  // Ensure overlay
  const overlayRoot = `${LIB_ROOT}/containers/${containerId}`;
  Deno.mkdirSync(`${overlayRoot}/diff`, { recursive: true });
  Deno.mkdirSync(`${overlayRoot}/work`, { recursive: true });
  Deno.mkdirSync(`${overlayRoot}/merged`, { recursive: true });

  Deno.writeTextFileSync(
    `${overlayRoot}/hostname`,
    getHostNameFromContainerId(containerId),
    { create: true }
  );

  Deno.writeTextFileSync(
    `${overlayRoot}/hosts`,
    `127.0.0.1       localhost\n` +
      `::1     localhost ip6-localhost ip6-loopback\n` +
      `fe00::0 ip6-localnet\n` +
      `ff00::0 ip6-mcastprefix\n` +
      `ff02::1 ip6-allnodes\n` +
      `ff02::2 ip6-allrouters\n`,
    { create: true }
  );

  // mount -t overlay overlay -o lowerdir="$LIB_ROOT/images/$IMAGE-latest,upperdir=$LIB_ROOT/containers/$ID/diff,workdir=$LIB_ROOT/containers/$ID/work" "$LIB_ROOT/containers/$ID/merged"
  mount(
    "overlay",
    `${overlayRoot}/merged`,
    "overlay",
    MS_MGC_VAL,
    `lowerdir=${LIB_ROOT}/images/ubuntu,upperdir=${overlayRoot}/diff,workdir=${overlayRoot}/work\0`
  );

  unshare(CLONE_NEWPID | CLONE_NEWUTS | CLONE_NEWIPC);

  const pid = fork();

  if (pid < 0) throw new Error("An error occurred during fork()");

  // Child
  if (pid === 0) {
    try {
      child(containerId, args);
      Deno.exit(0);
    } catch {
      Deno.exit(1);
    }
    return;
  }

  // Parent
  const result = waitPid(pid);

  // Cleanup
  umount(`${overlayRoot}/merged`, MNT_DETACH | MNT_FORCE);

  return result.code;
};

const child = (containerId: string, args: string[]) => {
  // Ensure overlay
  const overlayRoot = `${LIB_ROOT}/containers/${containerId}`;

  unshare(CLONE_NEWNS);

  // // Set hostname to containerId
  setHostname(getHostNameFromContainerId(containerId));

  // ensure that changes to our mount namespace do not "leak" to
  // outside namespaces (same as mount --make-rprivate /)
  mount("none", "/", null, MS_REC | MS_PRIVATE, null);

  Deno.chdir(`${overlayRoot}/merged`);
  Deno.mkdirSync(`${overlayRoot}/merged/.old`, { recursive: true });

  // Pivot into the container image root fs
  pivotRoot(`.`, `.old`);

  Deno.createSync("/etc/resolv.conf");
  mount(
    `/.old/etc/resolv.conf`,
    "/etc/resolv.conf",
    null,
    MS_MGC_VAL | MS_BIND,
    null
  );

  ["hostname", "hosts"].forEach((file) => {
    Deno.createSync(`/etc/${file}`);
    mount(
      `/.old/${LIB_ROOT}/containers/${containerId}/${file}`,
      `/etc/${file}`,
      null,
      MS_MGC_VAL | MS_BIND,
      null
    );
  });

  umount("/.old", MNT_DETACH);

  Deno.removeSync("/.old");

  mount(
    "proc",
    "/proc",
    "proc",
    MS_NOSUID | MS_NODEV | MS_NOEXEC | MS_RELATIME,
    null
  );

  mount(
    "sysfs",
    "/sys",
    "sysfs",
    MS_RDONLY | MS_NOSUID | MS_NODEV | MS_NOEXEC | MS_RELATIME,
    null
  );

  // tmpfs on /dev type tmpfs (rw,nosuid,seclabel,size=65536k,mode=755)
  mount("tmpfs", "/dev", "tmpfs", MS_NOSUID, "size=65536k,mode=755");

  Deno.mkdirSync("/dev/shm", { recursive: true });
  mount(
    "shmfs",
    "/dev/shm",
    "tmpfs",
    MS_NOSUID | MS_NODEV | MS_NOEXEC | MS_RELATIME,
    "size=65536k"
  );

  Deno.mkdirSync("/dev/pts", { recursive: true });
  mount(
    "devpts",
    "/dev/pts",
    "devpts",
    MS_NOSUID | MS_NOEXEC | MS_RELATIME,
    "gid=5,mode=620,ptmxmode=666"
  );

  const binary = args[0];
  const rest = args.slice(1);

  exec(binary, rest, {
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    TERM: "xterm",
  });
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
