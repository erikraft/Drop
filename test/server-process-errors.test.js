import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const processErrorModule = new URL("../server/process-error-handlers.js", import.meta.url).href;

function runChild(source) {
    const script = `import { installProcessErrorLogging } from ${JSON.stringify(processErrorModule)};
installProcessErrorLogging();
${source}`;

    return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 5000
    });
}

test("uncaught exceptions are logged without suppressing the default process exit", () => {
    const result = runChild("throw new Error('fatal exception regression');");

    assert.equal(result.error, undefined, "child process must exit instead of hanging");
    assert.notEqual(result.status, 0, "uncaught exception must terminate the process");
    assert.match(`${result.stdout}\n${result.stderr}`, /fatal exception regression/);
});

test("unhandled promise rejections retain Node's fail-closed default behavior", () => {
    const result = runChild("Promise.reject(new Error('fatal rejection regression'));");

    assert.equal(result.error, undefined, "child process must exit instead of hanging");
    assert.notEqual(result.status, 0, "unhandled rejection must terminate the process");
    assert.match(`${result.stdout}\n${result.stderr}`, /fatal rejection regression/);
});
