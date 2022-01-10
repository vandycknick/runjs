import { copy } from "https://deno.land/std@0.120.0/fs/copy.ts";

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
    MNT_DETACH,
} from "./libc.ts";

const LIB_ROOT = "/var/lib/deno-cri";
const containerId = crypto.randomUUID();

// Ensure libroot exists
await Deno.mkdir(LIB_ROOT, { recursive: true });

// Ensure overlay
const overlayRoot = `${LIB_ROOT}/containers/${containerId}`;
await Deno.mkdir(`${overlayRoot}/diff`, { recursive: true });
await Deno.mkdir(`${overlayRoot}/work`, { recursive: true });
await Deno.mkdir(`${overlayRoot}/merged`, { recursive: true });

// mount -t overlay overlay -o lowerdir="$LIB_ROOT/images/$IMAGE-latest,upperdir=$LIB_ROOT/containers/$ID/diff,workdir=$LIB_ROOT/containers/$ID/work" "$LIB_ROOT/containers/$ID/merged"
mount(
    "overlay",
    `${overlayRoot}/merged`,
    "overlay",
    MS_MGC_VAL,
    `lowerdir=${LIB_ROOT}/images/alpine,upperdir=${overlayRoot}/diff,workdir=${overlayRoot}/work\0`
);

unshare(CLONE_NEWUTS | CLONE_NEWPID | CLONE_NEWNS);

// Set hostname to containerId
setHostname(containerId);

/* ensure that changes to our mount namespace do not "leak" to
 * outside namespaces (same as mount --make-rprivate /)
 */
mount("none", "/", null, MS_REC | MS_PRIVATE, null);

Deno.chdir(`${overlayRoot}/merged`);

await Deno.mkdir(`${overlayRoot}/merged/.cache/deno`, { recursive: true });
await copy("/root/.cache/deno", `${overlayRoot}/merged/root/.cache/deno`, {
    overwrite: true,
});

await Deno.mkdir(`${overlayRoot}/merged/.old`, { recursive: true });

pivotRoot(`.`, `.old`);

umount("/.old", MNT_DETACH);

// await Deno.remove("/.old", { recursive: true });

// mount("proc", "/proc", "proc", 0, null);

const p = Deno.run({
    cmd: ["sh"],
    cwd: "/",
});

await p.status();

const run = async () => {};

const child = async () => {};

const main = async (args: string[]) => {
    switch (args[0]) {
        case "child":
            await child();
            break;
        default:
            await run();
            break;
    }
};

await main(Deno.args);
