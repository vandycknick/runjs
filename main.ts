import {
  CLONE_NEWUTS,
  CLONE_NEWPID,
  CLONE_NEWNS,
  unshare,
  pivotRoot,
  setHostname,
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
  exec,
} from "./libc.ts";

const LIB_ROOT = "/var/lib/runjs";

const getHostNameFromContainerId = (containerId: string) =>
  containerId.split("-").join("").substring(0, 13);

const run = async () => {
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

  unshare(CLONE_NEWPID);

  const cmd = ["/proc/self/exe", "child", containerId, ...Deno.args];
  const p = Deno.run({ cmd, uid: 0, gid: 0 });
  const status = await p.status();

  // Cleanup
  umount(`${overlayRoot}/merged`, MNT_DETACH | MNT_FORCE);

  return status;
};

const child = (containerId: string, args: string[]) => {
  // Ensure overlay
  const overlayRoot = `${LIB_ROOT}/containers/${containerId}`;

  unshare(CLONE_NEWUTS | CLONE_NEWNS);

  // // Set hostname to containerId
  setHostname(getHostNameFromContainerId(containerId));

  /* ensure that changes to our mount namespace do not "leak" to
   * outside namespaces (same as mount --make-rprivate /)
   */
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

  exec("/bin/sh", ["sh", "-i"], {
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    TERM: "xterm",
  });
};

const main = async (args: string[]) => {
  switch (args[0]) {
    case "child":
      child(args[1], args.slice(2));
      break;
    default: {
      const status = await run();
      Deno.exit(status.code);
    }
  }
};

await main(Deno.args);
