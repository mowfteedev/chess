import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.argv[2];
if (!base)
  throw new Error(
    "Usage: node scripts/measure-room-latency.mjs <frontend-url> [label]. Creates one QA room and plays 10 moves.",
  );
const label = process.argv[3] || "before";
const browser = await chromium.launch();
const http = [],
  samples = [],
  errors = [];
const steps = [
  ["e2", "e4"],
  ["e7", "e5"],
  ["g1", "f3"],
  ["b8", "c6"],
  ["f1", "c4"],
  ["g8", "f6"],
  ["d2", "d3"],
  ["f8", "c5"],
  ["e1", "g1"],
  ["d7", "d6"],
];
try {
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    pages.push(page);
    page.on("pageerror", (e) => errors.push(e.message));
    const starts = new Map();
    page.on("request", (r) => {
      if (
        r.url().includes("/functions/v1/chess-rooms") &&
        r.method() === "POST"
      )
        starts.set(r, performance.now());
    });
    page.on("response", async (r) => {
      if (starts.has(r.request()))
        http.push({
          ms: Math.round(performance.now() - starts.get(r.request())),
          status: r.status(),
          region: r.headers()["x-sb-edge-region"],
        });
    });
    await page.goto(base);
  }
  const [host, guest] = pages;
  await host
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  await host
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await host.getByTestId("room-code").waitFor({ timeout: 30000 });
  const code = await host.getByTestId("room-code").innerText();
  await guest
    .getByRole("button", { name: "Tham gia phòng", exact: true })
    .click();
  await guest.getByLabel("Mã phòng", { exact: true }).fill(code);
  await guest
    .getByRole("button", { name: "Ngồi vào bàn", exact: true })
    .click();
  await host.getByRole("gridcell").first().waitFor({ timeout: 30000 });
  for (let i = 0; i < steps.length; i++) {
    const own = pages[i % 2],
      peer = pages[(i + 1) % 2];
    const [from, to] = steps[i];
    await own.locator(`[data-square="${from}"]`).click();
    const start = performance.now();
    const ownSeen = own
      .waitForFunction(
        (n) =>
          document.querySelector('[data-testid="move-count"]')?.textContent ===
          String(n),
        i + 1,
      )
      .then(() => Math.round(performance.now() - start));
    const peerSeen = peer
      .waitForFunction(
        (n) =>
          document.querySelector('[data-testid="move-count"]')?.textContent ===
          String(n),
        i + 1,
      )
      .then(() => Math.round(performance.now() - start));
    await own.locator(`[data-square="${to}"]`).click();
    const [selfMs, peerMs] = await Promise.all([ownSeen, peerSeen]);
    samples.push({ ply: i + 1, selfMs, peerMs });
  }
  const measured = samples.slice(2);
  const percentile = (key, p) => {
    const a = measured.map((s) => s[key]).sort((a, b) => a - b);
    return a[Math.ceil(a.length * p) - 1];
  };
  const report = {
    label,
    base,
    date: new Date().toISOString(),
    warmup: 2,
    n: measured.length,
    samples,
    http,
    errors,
    self: { p50: percentile("selfMs", 0.5), p95: percentile("selfMs", 0.95) },
    peer: { p50: percentile("peerMs", 0.5), p95: percentile("peerMs", 0.95) },
  };
  await mkdir("test-results", { recursive: true });
  await writeFile(
    `test-results/perf-${label.replace(/[^a-zA-Z0-9_-]/g, "")}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
