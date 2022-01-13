import { printf } from "https://deno.land/std@0.121.0/fmt/printf.ts";
import {
  CLONE_NEWNS,
  CLONE_NEWUTS,
  CLONE_NEWIPC,
  CLONE_NEWPID,
  unshare,
  pivotRoot,
  mount,
  MS_REC,
  MS_PRIVATE,
  MS_MGC_VAL,
  umount,
  MNT_FORCE,
  MNT_DETACH,
  MS_RDONLY,
  MS_NOSUID,
  MS_NODEV,
  MS_NOEXEC,
  MS_RELATIME,
  MS_BIND,
  setHostname,
  fork,
  exec,
  waitPid,
} from "../libc/mod.ts";

const LIB_ROOT = "/var/lib/runjs";

const getHostNameFromContainerId = (containerId: string) =>
  containerId.split("-").join("").substring(0, 13);

const run = async (args: string[]) => {
  if (args.length === 0) {
    throw new Error("'runjs run' requires at least 1 argument");
  }

  const containerId = crypto.randomUUID();

  // Ensure libroot exists
  await Deno.mkdir(LIB_ROOT, { recursive: true });

  // Ensure overlay
  const overlayRoot = `${LIB_ROOT}/containers/${containerId}`;
  await Deno.mkdir(`${overlayRoot}/diff`, { recursive: true });
  await Deno.mkdir(`${overlayRoot}/work`, { recursive: true });
  await Deno.mkdir(`${overlayRoot}/merged`, { recursive: true });

  await Deno.writeTextFile(
    `${overlayRoot}/hostname`,
    getHostNameFromContainerId(containerId),
    { create: true }
  );

  await Deno.writeTextFile(
    `${overlayRoot}/hosts`,
    `127.0.0.1       localhost
::1     localhost ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters\n`,
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

const main = async (args: string[]) => {
  const [command, ...rest] = args;
  switch (command) {
    case "run": {
      const status = await run(rest);
      Deno.exit(status);
      break;
    }
    default: {
      console.log("Unknown command");
      Deno.exit(1);
      break;
    }
  }
};

await main(Deno.args);
