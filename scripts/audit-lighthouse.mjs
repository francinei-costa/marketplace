import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as wait } from "node:timers/promises";
import { createRequire } from "node:module";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import config from "../lighthouse.config.json" with { type: "json" };

const require = createRequire(import.meta.url);
const lighthouseVersion = require("lighthouse/package.json").version;
const outputDirectory = "reports/lighthouse";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args[0]} terminou com código ${code}.`));
    });
  });
}

async function ensurePortAvailable() {
  const port = Number(new URL(config.baseUrl).port);
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "localhost", () => server.close(resolve));
  });
}

async function waitForPreview(preview) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`O preview terminou com código ${preview.exitCode}.`);
    }
    try {
      const response = await fetch(config.baseUrl);
      if (response.ok) return;
    } catch {}
    await wait(1000);
  }
  throw new Error(`O preview não respondeu em ${config.baseUrl}.`);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

await run(["node_modules/typescript/bin/tsc", "-b"]);
await run(["node_modules/vite/bin/vite.js", "build"]);
await mkdir(outputDirectory, { recursive: true });
await ensurePortAvailable();
const preview = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "localhost", "--strictPort"],
  { stdio: "inherit" },
);

try {
  await waitForPreview(preview);
  const browser = await launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  const scores = [];

  try {
    for (const [profile, viewport] of Object.entries(config.profiles)) {
      for (const page of config.pages) {
        for (let runNumber = 1; runNumber <= config.runs; runNumber += 1) {
          const name = `${profile}-${page.name}-${runNumber}`;
          const isMobile = profile === "mobile";
          const result = await lighthouse(
            new URL(page.path, config.baseUrl).toString(),
            {
              port: browser.port,
              output: "html",
              logLevel: "error",
              onlyCategories: config.categories,
              formFactor: isMobile ? "mobile" : "desktop",
              screenEmulation: {
                mobile: isMobile,
                width: viewport.width,
                height: viewport.height,
                deviceScaleFactor: viewport.deviceScaleFactor,
                disabled: false,
              },
            },
          );
          const lhr = result.lhr;
          const categoryScores = Object.fromEntries(
            config.categories.map((category) => [
              category,
              Math.round((lhr.categories[category]?.score ?? 0) * 100),
            ]),
          );
          const reportPath = `${outputDirectory}/${name}`;
          await writeFile(`${reportPath}.html`, result.report);
          await writeFile(`${reportPath}.json`, JSON.stringify(lhr, null, 2));
          scores.push({
            profile,
            page: page.name,
            run: runNumber,
            categories: categoryScores,
            metrics: {
              lcp: lhr.audits["largest-contentful-paint"]?.numericValue,
              cls: lhr.audits["cumulative-layout-shift"]?.numericValue,
              tbt: lhr.audits["total-blocking-time"]?.numericValue,
            },
          });
          console.log(`${name}: ${JSON.stringify(categoryScores)}`);
        }
      }
    }
  } finally {
    await browser.kill();
  }

  const summaries = [];
  for (const profile of Object.keys(config.profiles)) {
    for (const page of config.pages) {
      const runs = scores.filter((entry) => entry.profile === profile && entry.page === page.name);
      summaries.push({
        profile,
        page: page.name,
        medianScores: Object.fromEntries(
          config.categories.map((category) => [
            category,
            median(runs.map((entry) => entry.categories[category])),
          ]),
        ),
        medianMetrics: Object.fromEntries(
          ["lcp", "cls", "tbt"].map((metric) => [
            metric,
            median(runs.map((entry) => entry.metrics[metric] ?? 0)),
          ]),
        ),
      });
    }
  }
  await writeFile(
    `${outputDirectory}/summary.json`,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        node: process.version,
        lighthouse: lighthouseVersion,
        environment: process.platform,
        runsPerPageAndProfile: config.runs,
        results: summaries,
        measurements: scores,
      },
      null,
      2,
    ),
  );
} finally {
  if (preview.exitCode === null && preview.pid) {
    preview.kill();
    await new Promise((resolve) => preview.once("exit", resolve));
  }
}
