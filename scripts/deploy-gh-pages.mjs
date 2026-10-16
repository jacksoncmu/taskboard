// Publishes ./dist to the `gh-pages` branch of the `origin` remote.
// Usage: npm run deploy   (builds first, then runs this script)
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const out = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const dist = path.resolve("dist");
if (!existsSync(path.join(dist, "index.html"))) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const remote = out("git remote get-url origin");
const sha = out("git rev-parse --short HEAD");
const dir = mkdtempSync(path.join(tmpdir(), "taskboard-pages-"));

try {
  cpSync(dist, dir, { recursive: true });
  writeFileSync(path.join(dir, ".nojekyll"), "");
  run("git init -q -b gh-pages", dir);
  run("git add -A", dir);
  run(`git commit -q -m "Deploy ${sha}"`, dir);
  run(`git push -f "${remote}" gh-pages`, dir);
  console.log(`\nDeployed ${sha} to the gh-pages branch of ${remote}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
