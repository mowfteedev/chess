import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { readFile } from "node:fs/promises";

const BASE = "http://127.0.0.1:4174";
let opened: BrowserContext[] = [];
let errors: string[] = [];
test.beforeEach(() => {
  opened = [];
  errors = [];
});
test.afterEach(async () => {
  await Promise.all(opened.map((context) => context.close()));
  expect(errors).toEqual([]);
});
function track(page: Page) {
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}
async function newPlayer(browser: Browser) {
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, "RTCPeerConnection", {
      value: class {
        constructor() {
          throw new Error("This test forbids peer-to-peer connections");
        }
      },
    });
  });
  opened.push(context);
  const page = track(await context.newPage());
  await page.goto("/");
  return { context, page };
}
async function create(page: Page, color: "w" | "b" = "w") {
  await page
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  await page.getByLabel("Tên của bạn").fill("Minh");
  if (color === "b")
    await page.getByRole("button", { name: /Quân đen/ }).click();
  await page
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toBeVisible({ timeout: 20000 });
  return (await page.getByTestId("room-code").textContent())!;
}
async function join(page: Page, code: string, name = "An") {
  await page
    .getByRole("button", { name: "Tham gia phòng", exact: true })
    .click();
  await page.getByLabel("Tên của bạn").fill(name);
  await page.getByLabel("Mã phòng", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Ngồi vào bàn", exact: true }).click();
}
async function players(browser: Browser, color: "w" | "b" = "w") {
  const host = await newPlayer(browser),
    guest = await newPlayer(browser);
  const code = await create(host.page, color);
  await join(guest.page, code);
  await expect(host.page.getByRole("gridcell")).toHaveCount(64, {
    timeout: 20000,
  });
  await expect(guest.page.getByRole("gridcell")).toHaveCount(64, {
    timeout: 20000,
  });
  return {
    host: host.page,
    guest: guest.page,
    hostContext: host.context,
    guestContext: guest.context,
    code,
  };
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
async function sequence(host: Page, guest: Page, moves: string[][]) {
  for (let index = 0; index < moves.length; index++) {
    await move(index % 2 ? guest : host, moves[index][0], moves[index][1]);
    await count(host, index + 1);
    await count(guest, index + 1);
  }
}

test("first visit presents only create and join, with no computer opponent", async ({
  page,
}) => {
  track(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tạo phòng mới", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tham gia phòng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Gambit Bot|Thư giãn|Cân bằng|Thử thách/),
  ).toHaveCount(0);
  await expect(page.getByRole("gridcell")).toHaveCount(0);
});

test("joining validates a room code and accepts pasted invitation links", async ({
  page,
}) => {
  track(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tham gia phòng", exact: true })
    .click();
  await page.getByRole("button", { name: "Ngồi vào bàn", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("6 ký tự");
  await expect(page.getByLabel("Mã phòng", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Mã phòng", { exact: true }).evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/plain", "https://example.com/chess/?v=abc#room=AB2345");
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: data }),
    );
  });
  await expect(page.getByLabel("Mã phòng", { exact: true })).toHaveValue(
    "AB2345",
  );
});

test("waiting room shares a real code and a versioned invitation", async ({
  browser,
}) => {
  const { page, context } = await newPlayer(browser);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const code = await create(page);
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  await page
    .getByRole("button", { name: "Sao chép link", exact: true })
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).hash).toBe(`#room=${code}`);
  expect(new URL(link).searchParams.get("v")).toBeTruthy();
});

test("two browsers synchronize moves and enforce each player color", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await expect(guest.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "h1",
  );
  await expect(guest.locator('.board-piece[draggable="true"]')).toHaveCount(0);
  await guest.locator('[data-square="e4"]').evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/plain", "e2");
    element.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: data }),
    );
  });
  await count(host, 0);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  await expect(host.locator('[data-square="e5"]')).toHaveAccessibleName(
    "e5, Tốt đen",
  );
  await expect(guest.locator('[data-square="e4"]')).toHaveAccessibleName(
    "e4, Tốt trắng",
  );
});

test("creator can choose black and the invited player moves first", async ({
  browser,
}) => {
  const { host, guest } = await players(browser, "b");
  await expect(host.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "h1",
  );
  await expect(guest.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "a8",
  );
  await move(guest, "e2", "e4");
  await count(host, 1);
  await move(host, "e7", "e5");
  await count(guest, 2);
});

test("a third player cannot take an occupied seat", async ({ browser }) => {
  const { host, guest, code } = await players(browser);
  const third = await newPlayer(browser);
  await join(third.page, code, "Người thứ ba");
  await expect(
    third.page.getByText("Phòng đã đủ hai người.", { exact: false }),
  ).toBeVisible();
  await expect(third.page.getByRole("gridcell")).toHaveCount(0);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
});

test("guest reload reclaims its seat and complete move history", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  const restored = guest.waitForResponse((response) =>
    response.url().includes("/rest/v1/rpc/gambit_heartbeat"),
  );
  await guest.reload();
  const restoredRow = await (await restored).json();
  await expect(guest.getByRole("gridcell")).toHaveCount(64, { timeout: 25000 });
  await expect(guest.getByText("2/2 đã kết nối", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  // The host can still show its pre-reload online state until it receives the new heartbeat.
  await host.waitForResponse(async (response) => {
    if (!response.url().includes("/rest/v1/gambit_rooms?")) return false;
    const body = await response.json();
    const row = Array.isArray(body) ? body[0] : body;
    return (
      !row.guest_left &&
      Date.parse(row.guest_seen) >= Date.parse(restoredRow.guest_seen)
    );
  });
  await expect(host.getByText("2/2 đã kết nối", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await count(host, 2);
  await count(guest, 2);
  await move(host, "g1", "f3");
  await count(guest, 3);
});

test("host reload restores the server state and reconnects the guest", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  await host.reload();
  await expect(host.getByText("2/2 đã kết nối", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await expect(guest.getByText("2/2 đã kết nối", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await count(host, 2);
  await count(guest, 2);
  await move(host, "g1", "f3");
  await count(guest, 3);
});

test("a delayed presence read cannot undo a newer reconnection or clear the selected piece", async ({
  browser,
}) => {
  const { host, guest, code } = await players(browser);
  const values = Object.fromEntries(
    (await readFile(".env.test.local", "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
  const heartbeat = (online: boolean) =>
    guest.evaluate(
      async ({ code, key, online }) => {
        const session = JSON.parse(sessionStorage.getItem("gambit-auth")!);
        const response = await fetch(
          "http://127.0.0.1:56321/rest/v1/rpc/gambit_heartbeat",
          {
            method: "POST",
            headers: {
              apikey: key,
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ p_code: code, p_online: online }),
          },
        );
        if (!response.ok) throw new Error("Test heartbeat failed");
      },
      { code, key: values.VITE_SUPABASE_PUBLISHABLE_KEY, online },
    );
  let captured!: () => void;
  let release!: () => void;
  const capturedRead = new Promise<void>((resolve) => {
    captured = resolve;
  });
  const releaseRead = new Promise<void>((resolve) => {
    release = resolve;
  });
  await host.route("**/rest/v1/gambit_rooms?**", async (route) => {
    const response = await route.fetch();
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (row?.guest_left) {
      captured();
      await releaseRead;
    }
    await route.fulfill({ response });
  });
  try {
    await heartbeat(false);
    await expect(
      host.getByText("2/2 đã kết nối", { exact: true }),
    ).toBeHidden();
    await capturedRead;
    await heartbeat(true);
    await expect(
      host.getByText("2/2 đã kết nối", { exact: true }),
    ).toBeVisible();
    await host.locator('[data-square="e2"]').click();
    await expect(host.locator('[data-square="e2"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const delivered = host.waitForResponse((response) =>
      response.url().includes("/rest/v1/gambit_rooms?"),
    );
    release();
    await delivered;
    await host.locator('[data-square="e4"]').click();
    await count(host, 1);
    await count(guest, 1);
  } finally {
    release();
    await host.unrouteAll({ behavior: "wait" });
  }
});

test("disconnection keeps timed play available and leaving requires confirmation after a move", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  await guest.close();
  await expect(
    host.getByText("Đợi nhau một chút nhé.", { exact: true }),
  ).toBeVisible();
  await expect(host.getByTestId("clock-w")).toHaveClass(/running/);
  await expect(host.locator('.board-piece[draggable="true"]')).not.toHaveCount(
    0,
  );
  await host.getByRole("button", { name: "Rời phòng", exact: true }).click();
  await host.getByRole("button", { name: "Ở lại bàn cờ", exact: true }).click();
  await count(host, 2);
  await host.getByRole("button", { name: "Rời phòng", exact: true }).click();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Rời phòng", exact: true })
    .click();
  await expect(
    host.getByRole("button", { name: "Tạo phòng mới", exact: true }),
  ).toBeVisible();
});

test("resignation synchronizes and rematch needs consent before swapping colors", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  await guest.getByRole("button", { name: "Đầu hàng", exact: true }).click();
  await guest
    .getByRole("button", { name: "Xác nhận đầu hàng", exact: true })
    .click();
  await expect(host.getByRole("dialog")).toContainText(
    "Quân trắng chiến thắng.",
  );
  await expect(guest.getByRole("dialog")).toContainText(
    "Quân trắng chiến thắng.",
  );
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Mời bạn đấu lại", exact: true })
    .click();
  await expect(guest.getByRole("dialog")).toContainText(
    "Thêm một ván nữa nhé?",
  );
  await count(host, 2);
  await guest
    .getByRole("button", { name: "Nhận lời mời", exact: true })
    .click();
  await count(host, 0);
  await count(guest, 0);
  await expect(host.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "h1",
  );
  await expect(guest.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "a8",
  );
  await move(guest, "d2", "d4");
  await count(host, 1);
});

test("click, drag, flip, PGN and appearance work during an online match", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await move(host, "e2", "e4");
  await count(guest, 1);
  await guest
    .locator('[data-square="e7"] .board-piece')
    .dragTo(guest.locator('[data-square="e5"]'));
  await count(host, 2);
  await host.getByRole("button", { name: "Lật bàn", exact: true }).click();
  await expect(host.getByRole("gridcell").first()).toHaveAttribute(
    "data-square",
    "h1",
  );
  const download = host.waitForEvent("download");
  await host
    .getByRole("button", { name: "Tải biên bản PGN", exact: true })
    .click();
  const file = await download;
  expect(await readFile((await file.path())!, "utf8")).toContain("1. e4 e5");
  await host.getByRole("button", { name: "Màu bàn", exact: true }).click();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Vườn xanh", exact: true })
    .click();
  await host.keyboard.press("Escape");
  await host.getByRole("button", { name: "Tắt âm thanh", exact: true }).click();
  await host.reload();
  await expect(host.getByText("2/2 đã kết nối", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await expect(
    host.getByRole("button", { name: "Vườn xanh", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    host.getByRole("button", { name: "Bật âm thanh", exact: true }),
  ).toBeVisible();
});

test("keyboard moves and dialogs restore focus", async ({ browser }) => {
  const { host, guest } = await players(browser);
  await host.locator('[data-square="e2"]').focus();
  await host.keyboard.press("Enter");
  await host.keyboard.press("ArrowUp");
  await host.keyboard.press("ArrowUp");
  await host.keyboard.press("Enter");
  await count(guest, 1);
  const help = host.getByRole("button", { name: "Mẹo thao tác", exact: true });
  await help.click();
  await expect(host.getByRole("dialog")).toBeVisible();
  await host.keyboard.press("Escape");
  await expect(help).toBeFocused();
});

test("checkmate and castling synchronize through the actual room", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
    ["d1", "h5"],
    ["b8", "c6"],
    ["f1", "c4"],
    ["g8", "f6"],
    ["h5", "f7"],
  ]);
  await expect(host.getByRole("dialog")).toContainText(
    "Quân trắng chiến thắng.",
  );
  await expect(guest.getByRole("dialog")).toContainText(
    "Quân trắng chiến thắng.",
  );
});

test("castling moves the king and rook on both clients", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
    ["g1", "f3"],
    ["b8", "c6"],
    ["f1", "c4"],
    ["f8", "c5"],
    ["e1", "g1"],
  ]);
  await expect(guest.locator('[data-square="g1"]')).toHaveAccessibleName(
    "g1, Vua trắng",
  );
  await expect(guest.locator('[data-square="f1"]')).toHaveAccessibleName(
    "f1, Xe trắng",
  );
});

test("en passant removes the captured pawn on both clients", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["a7", "a6"],
    ["e4", "e5"],
    ["d7", "d5"],
    ["e5", "d6"],
  ]);
  await expect(guest.locator('[data-square="d5"]')).toHaveAccessibleName(
    "d5, ô trống",
  );
  await expect(guest.locator('[data-square="d6"]')).toHaveAccessibleName(
    "d6, Tốt trắng",
  );
});

test("promotion can be canceled and then synchronized without inventing captured pawns", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["a2", "a4"],
    ["h7", "h5"],
    ["a4", "a5"],
    ["h5", "h4"],
    ["a5", "a6"],
    ["h4", "h3"],
    ["a6", "b7"],
    ["h3", "g2"],
  ]);
  await move(host, "b7", "a8");
  await expect(host.getByRole("dialog")).toBeVisible();
  await count(guest, 8);
  await host.getByRole("button", { name: "Hủy nước đi", exact: true }).click();
  await count(host, 8);
  await move(host, "b7", "a8");
  await host.getByRole("button", { name: "Hậu", exact: true }).click();
  await count(guest, 9);
  await expect(guest.locator('[data-square="a8"]')).toHaveAccessibleName(
    "a8, Hậu trắng",
  );
  await expect(host.locator('[title="1 Tốt trắng"]')).toHaveCount(1);
});

test("an invitation opens the prefilled join form without claiming a seat", async ({
  page,
}) => {
  track(page);
  await page.goto("/?v=test#room=AB2345");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Mã phòng", { exact: true })).toHaveValue(
    "AB2345",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Tạo phòng mới", exact: true }),
  ).toBeVisible();
});

test("missing rooms show a useful error and allow returning to the lobby", async ({
  page,
}) => {
  track(page);
  await page.goto("/");
  await join(page, "ZZZ999");
  await expect(
    page.getByText("Không tìm thấy phòng.", { exact: false }),
  ).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Về sảnh", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạo phòng mới", exact: true }),
  ).toBeVisible();
});

test("version checks bypass cache and offer an explicit versioned reload", async ({
  page,
}) => {
  track(page);
  let cacheQuery = "";
  await page.route("**/version.json?*", async (route) => {
    cacheQuery = new URL(route.request().url()).searchParams.get("check") ?? "";
    await route.fulfill({
      json: {
        version: "newbuild-release",
        revision: "newbuild",
        builtAt: new Date().toISOString(),
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("Có phiên bản mới của Gambit.", { exact: true }),
  ).toBeVisible();
  expect(cacheQuery.length).toBeGreaterThan(8);
  await page
    .getByRole("button", { name: "Cập nhật ngay", exact: true })
    .click();
  await expect(page).toHaveURL(/\?v=newbuild-release/);
});

for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1024],
  [1440, 900],
]) {
  test(`lobby layout and touch targets at ${width}×${height}`, async ({
    page,
  }) => {
    track(page);
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(width);
    for (const title of ["Tạo phòng mới", "Tham gia phòng"]) {
      const button = page.getByRole("button", { name: title, exact: true });
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThan(44);
      expect(box!.height).toBeGreaterThan(44);
      if (width <= 390) expect(box!.y + box!.height).toBeLessThan(height);
    }
  });
}

test("mobile room fits the width and all controls remain reachable", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await guest.setViewportSize({ width: 390, height: 844 });
  expect(await guest.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const board = await guest.locator(".chess-board").boundingBox();
  expect(Math.abs(board!.width - board!.height)).toBeLessThan(1);
  expect(board!.y + board!.height).toBeLessThan(844);
  for (const name of ["Màu bàn", "Lật bàn", "Âm thanh", "Nước đi"]) {
    const button = guest.getByRole("button", {
      name,
      exact: name !== "Âm thanh",
    });
    const target =
      name === "Âm thanh"
        ? guest.getByRole("button", { name: "Tắt âm thanh", exact: true })
        : button;
    const box = await target.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await guest.getByRole("button", { name: "Nước đi", exact: true }).click();
  await expect(guest.getByRole("dialog")).toContainText(
    "Câu chuyện của ván cờ.",
  );
  await guest.keyboard.press("Escape");
  await move(host, "e2", "e4");
  await count(guest, 1);
});

test("a failed stale entry script offers recovery instead of a blank page", async ({
  page,
}) => {
  track(page);
  await page.route("**/assets/index-*.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(
    page.getByText("Mình tải lại bàn cờ nhé.", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/assets/index-*.js");
  await page.getByRole("link", { name: "Tải lại Gambit", exact: true }).click();
  await expect(page).toHaveURL(/\?v=\d+/);
  await expect(
    page.getByRole("button", { name: "Tạo phòng mới", exact: true }),
  ).toBeVisible();
});

test("a new version does not reload or discard a live match without a choice", async ({
  browser,
}) => {
  const { host, guest } = await players(browser);
  await sequence(host, guest, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);
  const before = host.url();
  await host.route("**/version.json?*", (route) =>
    route.fulfill({
      json: {
        version: "newbuild-release",
        revision: "newbuild",
        builtAt: new Date().toISOString(),
      },
    }),
  );
  await host
    .getByRole("button", { name: "Kiểm tra cập nhật", exact: true })
    .click();
  await expect(
    host.getByText("Có phiên bản mới của Gambit.", { exact: true }),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Cập nhật ngay", exact: true })
    .click();
  await expect(host.getByRole("dialog")).toContainText("Cập nhật Gambit?");
  expect(host.url()).toBe(before);
  await host.getByRole("button", { name: "Ở lại bàn cờ", exact: true }).click();
  await count(host, 2);
  await count(guest, 2);
});

test("server rejects wrong turns, duplicate delivery and direct state writes", async ({
  browser,
}) => {
  const { host, guest, code } = await players(browser);
  const invoke = async (
    page: Page,
    input: Record<string, unknown>,
    path = "/functions/v1/chess-rooms",
    method = "POST",
  ) =>
    page.evaluate(
      async ({ input, path, method }) => {
        const session = JSON.parse(sessionStorage.getItem("gambit-auth")!);
        const key = (window as unknown as { testPublicKey: string })
          .testPublicKey;
        const response = await fetch(`http://127.0.0.1:56321${path}`, {
          method,
          headers: {
            apikey: key,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });
        return {
          status: response.status,
          body: await response.json().catch(() => null),
        };
      },
      { input, path, method },
    );
  const values = Object.fromEntries(
    (await readFile(".env.test.local", "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
  await guest.evaluate((key) => {
    (window as unknown as { testPublicKey: string }).testPublicKey = key;
  }, values.VITE_SUPABASE_PUBLISHABLE_KEY);
  const wrong = await invoke(guest, {
    action: "command",
    code,
    id: crypto.randomUUID(),
    round: 0,
    ply: 0,
    command: { kind: "move", move: { from: "e7", to: "e5" } },
  });
  expect(wrong.status).toBe(409);
  expect(wrong.body.error.code).toBe("wrong_turn");
  await count(host, 0);
  await move(host, "e2", "e4");
  await count(guest, 1);
  const command = {
    action: "command",
    code,
    id: crypto.randomUUID(),
    round: 0,
    ply: 1,
    command: { kind: "move", move: { from: "e7", to: "e5" } },
  };
  const responses = await Promise.all([
    invoke(guest, command),
    invoke(guest, command),
  ]);
  expect(responses.map((result) => result.status)).toEqual([200, 200]);
  await count(host, 2);
  const forged = await invoke(
    guest,
    { game: { moves: ["e4", "e5", "Qh5"] } },
    `/rest/v1/gambit_rooms?code=eq.${code}`,
    "PATCH",
  );
  expect(forged.status).toBe(403);
  await count(host, 2);
  await expect(host.locator('[data-square="d1"]')).toHaveAccessibleName(
    "d1, Hậu trắng",
  );
});

test("failed room creation can be retried without returning to the lobby", async ({
  page,
}) => {
  track(page);
  await page.goto("/");
  await page.route(
    "**/functions/v1/chess-rooms",
    (route) => route.abort("failed"),
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Tạo phòng mới", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tạo phòng & mời bạn", exact: true })
    .click();
  await expect(
    page.getByText("Chưa gặp được nhau.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Thử kết nối lại", exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toBeVisible();
});

test("simultaneous joins reserve exactly one guest seat", async ({
  browser,
}) => {
  const creator = await newPlayer(browser);
  const code = await create(creator.page);
  const a = await newPlayer(browser),
    b = await newPlayer(browser);
  await Promise.all([join(a.page, code, "An"), join(b.page, code, "Bình")]);
  await Promise.all(
    [a.page, b.page].map((page) =>
      page.waitForFunction(
        () =>
          document.querySelector(".chess-board") ||
          document.querySelector(".waiting-error"),
      ),
    ),
  );
  expect(
    (await a.page.getByRole("gridcell").count()) +
      (await b.page.getByRole("gridcell").count()),
  ).toBe(64);
  const loser = (await a.page.getByRole("gridcell").count()) ? b.page : a.page;
  await expect(
    loser.getByText("Phòng đã đủ hai người.", { exact: false }),
  ).toBeVisible();
});

test("publishable key alone cannot submit game actions without a user session", async ({
  request,
}) => {
  const values = Object.fromEntries(
    (await readFile(".env.test.local", "utf8"))
      .trim()
      .split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
  const response = await request.post(
    "http://127.0.0.1:56321/functions/v1/chess-rooms",
    {
      headers: { apikey: values.VITE_SUPABASE_PUBLISHABLE_KEY },
      data: { action: "create", name: "Untrusted", color: "w" },
    },
  );
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("not_authenticated");
});
