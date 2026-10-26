import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { GameState } from "../../src/multiplayer/protocol";

const BASE = "http://127.0.0.1:4174";
const API = "http://127.0.0.1:56321";
let contexts: BrowserContext[] = [];
let errors: string[] = [];

test.beforeEach(() => {
  contexts = [];
  errors = [];
});
test.afterEach(async () => {
  await Promise.all(contexts.map((context) => context.close()));
  expect(errors).toEqual([]);
});

async function newPlayer(browser: Browser, instrumentAudio = false) {
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1440, height: 900 },
  });
  contexts.push(context);
  if (instrumentAudio) {
    await context.addInitScript(() => {
      const stats = { contexts: 0, resumes: 0, starts: 0 };
      (window as unknown as { testAudioStats: typeof stats }).testAudioStats =
        stats;
      const NativeAudioContext = window.AudioContext;
      class ObservedAudioContext extends NativeAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          stats.contexts++;
        }
        resume() {
          stats.resumes++;
          return super.resume();
        }
        createOscillator() {
          const oscillator = super.createOscillator();
          const start = oscillator.start.bind(oscillator);
          oscillator.start = (...args: Parameters<OscillatorNode["start"]>) => {
            stats.starts++;
            start(...args);
          };
          return oscillator;
        }
      }
      window.AudioContext = ObservedAudioContext;
    });
  }
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  return page;
}

async function create(page: Page, minutes = 1) {
  await page
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  await page.getByLabel("Tên của bạn").fill("Minh");
  await page
    .getByRole("group", { name: "Thời gian mỗi bên", exact: true })
    .getByRole("button", { name: `${minutes} phút`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toBeVisible({ timeout: 20000 });
  return (await page.getByTestId("room-code").innerText()).trim();
}

async function join(page: Page, code: string) {
  await page
    .getByRole("button", { name: "Tham gia phòng", exact: true })
    .click();
  await page.getByLabel("Tên của bạn").fill("An");
  await page.getByLabel("Mã phòng", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Ngồi vào bàn", exact: true }).click();
}

async function players(browser: Browser, instrumentAudio = false) {
  const host = await newPlayer(browser, instrumentAudio);
  const guest = await newPlayer(browser);
  const code = await create(host);
  await join(guest, code);
  await expect(host.getByRole("gridcell")).toHaveCount(64, { timeout: 20000 });
  await expect(guest.getByRole("gridcell")).toHaveCount(64, { timeout: 20000 });
  return { host, guest, code };
}

async function move(page: Page, from: string, to: string) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}

async function count(page: Page, value: number) {
  await expect(page.getByTestId("move-count").first()).toHaveText(
    String(value),
  );
}

function roomSql(code: string, statement: (safeCode: string) => string) {
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code))
    throw new Error("Invalid local test room");
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_gambit-chess-test",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atq",
      "-c",
      statement(code),
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function storedGame(code: string): GameState {
  return JSON.parse(
    roomSql(
      code,
      (safeCode) =>
        `select game::text from public.gambit_rooms where code = '${safeCode}'`,
    ),
  ) as GameState;
}

function seconds(value: string | null) {
  const match = value?.match(/(\d+):(\d{2})/);
  if (!match) throw new Error(`Expected a visible clock, received ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

async function invoke(page: Page, body: Record<string, unknown>) {
  const values = Object.fromEntries(
    (await readFile(".env.test.local", "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
  return page.evaluate(
    async ({ body, key, api }) => {
      const session = JSON.parse(sessionStorage.getItem("gambit-auth")!);
      const response = await fetch(`${api}/functions/v1/chess-rooms`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { body, key: values.VITE_SUPABASE_PUBLISHABLE_KEY, api: API },
  );
}

test("one minute starts when the second player joins; waiting consumes no clock", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  await host
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  const presets = host.getByRole("group", {
    name: "Thời gian mỗi bên",
    exact: true,
  });
  await expect(presets.getByRole("button")).toHaveCount(3);
  await expect(
    presets.getByRole("button", { name: "5 phút", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await presets.getByRole("button", { name: "1 phút", exact: true }).click();
  await host.getByLabel("Tên của bạn").fill("Minh");
  await host
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await expect(host.getByTestId("room-code")).toBeVisible({ timeout: 20000 });
  const code = (await host.getByTestId("room-code").innerText()).trim();
  expect(storedGame(code).clock).toMatchObject({
    initialMs: 60000,
    whiteMs: 60000,
    blackMs: 60000,
    runningSince: null,
  });
  const guest = await newPlayer(browser);
  await join(guest, code);
  await expect(host.getByTestId("clock-w")).toBeVisible();
  await expect(host.getByTestId("clock-b")).toHaveText("01:00");
  await expect
    .poll(async () => seconds(await host.getByTestId("clock-w").textContent()))
    .toBeLessThan(60);
  expect(storedGame(code).clock?.runningSince).toBeGreaterThan(0);
});

for (const minutes of [5, 10]) {
  test(`${minutes} minute preset persists the same duration for each player`, async ({
    browser,
  }) => {
    const host = await newPlayer(browser);
    const code = await create(host, minutes);
    expect(storedGame(code).clock).toMatchObject({
      initialMs: minutes * 60000,
      whiteMs: minutes * 60000,
      blackMs: minutes * 60000,
      runningSince: null,
    });
  });
}

test("only the moving side spends time and reload preserves the server clock", async ({
  browser,
}) => {
  const { host, guest, code } = await players(browser);
  await expect
    .poll(async () => seconds(await host.getByTestId("clock-w").textContent()))
    .toBeLessThan(60);
  await move(host, "e2", "e4");
  await count(guest, 1);
  const whiteMs = storedGame(code).clock!.whiteMs;
  expect(whiteMs).toBeLessThan(60000);
  await expect
    .poll(async () => seconds(await guest.getByTestId("clock-b").textContent()))
    .toBeLessThan(60);
  await guest.reload();
  await expect(guest.getByRole("gridcell")).toHaveCount(64, { timeout: 20000 });
  await expect(guest.getByTestId("clock-w")).toHaveText(
    `${String(Math.floor(Math.ceil(whiteMs / 1000) / 60)).padStart(2, "0")}:${String(Math.ceil(whiteMs / 1000) % 60).padStart(2, "0")}`,
  );
  expect(storedGame(code).clock!.whiteMs).toBe(whiteMs);
  await expect
    .poll(async () => seconds(await guest.getByTestId("clock-b").textContent()))
    .toBeLessThan(60);
  await count(guest, 1);
});

test("server rejects an early flag and invalid presets, then expiry settles once and rematch resets clocks", async ({
  browser,
}) => {
  const { host, guest, code } = await players(browser);
  const early = await invoke(guest, {
    action: "command",
    code,
    id: crypto.randomUUID(),
    round: 0,
    ply: 0,
    command: { kind: "claim-timeout" },
  });
  expect(early.status).toBe(409);
  expect(early.body.error.code).toBe("clock_running");
  const invalid = await invoke(host, {
    action: "create",
    name: "Invalid preset",
    color: "w",
    timeControl: 123,
  });
  expect(invalid.status).toBe(400);
  expect(storedGame(code).timeout ?? null).toBeNull();
  roomSql(
    code,
    (safeCode) => `
    update public.gambit_rooms
    set game = jsonb_set(jsonb_set(game, '{clock,whiteMs}', '300'::jsonb),
      '{clock,runningSince}', to_jsonb(floor(extract(epoch from clock_timestamp()) * 1000)::bigint)),
      revision = revision + 1
    where code = '${safeCode}';
  `,
  );
  await expect(host.getByRole("dialog")).toContainText(/hết giờ/i, {
    timeout: 15000,
  });
  await expect(guest.getByRole("dialog")).toContainText(/hết giờ/i, {
    timeout: 15000,
  });
  expect(storedGame(code)).toMatchObject({
    moves: [],
    timeout: { winner: "b" },
    clock: { whiteMs: 0, runningSince: null },
  });
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Mời bạn đấu lại", exact: true })
    .click();
  await expect(guest.getByRole("dialog")).toContainText(
    "Thêm một ván nữa nhé?",
  );
  await guest
    .getByRole("button", { name: "Nhận lời mời", exact: true })
    .click();
  await expect(host.getByTestId("clock-b")).toHaveText("01:00");
  await count(host, 0);
  const reset = storedGame(code);
  expect(reset).toMatchObject({
    round: 1,
    hostColor: "b",
    moves: [],
    clock: { initialMs: 60000, whiteMs: 60000, blackMs: 60000 },
  });
  expect(reset.timeout ?? null).toBeNull();
  expect(reset.clock!.runningSince).toBeGreaterThan(0);
});

test("join and leave are announced and a connected timed player can move while the opponent is away", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await expect(host.getByTestId("room-notification")).toContainText(
    "An đã vào bàn",
  );
  await guest.getByRole("button", { name: "Rời phòng", exact: true }).click();
  await expect(host.getByTestId("room-notification")).toContainText(
    "An đã rời bàn",
  );
  await move(host, "e2", "e4");
  await count(host, 1);
  await expect(host.locator('[data-square="e4"]')).toHaveAccessibleName(
    "e4, Tốt trắng",
  );
});

test("an immediate move survives a failed background read and rolls back on rejection", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  let release!: () => void;
  let captured!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    captured = resolve;
  });
  let intercepted = false;
  await host.route("**/functions/v1/chess-rooms", async (route) => {
    const body = route.request().postDataJSON();
    if (
      !intercepted &&
      body.action === "command" &&
      body.command.kind === "move"
    ) {
      intercepted = true;
      captured();
      await held;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "test_unavailable", message: "Thử lại nước đi nhé." },
        }),
      });
    } else await route.continue();
  });
  try {
    await move(host, "e2", "e4");
    await requested;
    await expect(host.locator('[data-square="e4"]')).toHaveAccessibleName(
      "e4, Tốt trắng",
    );
    await count(host, 1);
    await count(guest, 0);
    await host.route(
      "**/rest/v1/gambit_rooms?**",
      (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "test_poll_failure",
            message: "Temporary read failure",
          }),
        }),
      { times: 1 },
    );
    await expect(host.locator(".reconnect-banner")).toBeVisible({
      timeout: 8000,
    });
    await host.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/rest/v1/gambit_rooms?") &&
        response.ok(),
    );
    await expect(
      host.getByText("2/2 đã kết nối", { exact: true }),
    ).toBeVisible();
    await expect(
      host.getByText("Đang gửi nước đi…", { exact: true }),
    ).toBeVisible();
    await expect(host.locator('[data-square="e4"]')).toHaveAccessibleName(
      "e4, Tốt trắng",
    );
    await count(host, 1);
    await count(guest, 0);
    release();
    await expect(host.locator('[data-square="e2"]')).toHaveAccessibleName(
      "e2, Tốt trắng",
    );
    await count(host, 0);
    await move(host, "e2", "e4");
    await count(guest, 1);
  } finally {
    release();
    await host.unrouteAll({ behavior: "wait" });
  }
});

test("a lobby gesture unlocks audio and muting suppresses move and turn cues", async ({
  browser,
}) => {
  const host = await newPlayer(browser, true);
  const guest = await newPlayer(browser);
  await host
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  const stats = () =>
    host.evaluate(
      () =>
        (
          window as unknown as {
            testAudioStats: {
              contexts: number;
              resumes: number;
              starts: number;
            };
          }
        ).testAudioStats,
    );
  await expect.poll(async () => (await stats()).contexts).toBeGreaterThan(0);
  await host.getByLabel("Tên của bạn").fill("Minh");
  await host
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await expect(host.getByTestId("room-code")).toBeVisible({ timeout: 20000 });
  const code = (await host.getByTestId("room-code").innerText()).trim();
  await join(guest, code);
  await expect(host.getByRole("gridcell")).toHaveCount(64, { timeout: 20000 });
  const beforeMove = (await stats()).starts;
  await move(host, "e2", "e4");
  await count(guest, 1);
  await expect
    .poll(async () => (await stats()).starts)
    .toBeGreaterThan(beforeMove);
  await host.getByRole("button", { name: "Tắt âm thanh", exact: true }).click();
  await expect(
    host.getByRole("button", { name: "Bật âm thanh", exact: true }),
  ).toBeVisible();
  const mutedStarts = (await stats()).starts;
  await move(guest, "e7", "e5");
  await count(host, 2);
  await host.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  expect((await stats()).starts).toBe(mutedStarts);
});
