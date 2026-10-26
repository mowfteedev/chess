import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const messages: string[] = []
  errors.set(page, messages)
  page.on('pageerror', (error) => messages.push(error.message))
  await page.goto('/')
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

async function move(page: Page, from: string, to: string) {
  await page.locator(`[data-square="${from}"]`).click()
  await page.locator(`[data-square="${to}"]`).click()
}
async function friends(page: Page) {
  await page.getByRole('button', { name: 'Cùng bạn', exact: true }).click()
}
async function delayWorker(page: Page) {
  await page.route('**/assets/chess.worker-*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    await route.continue().catch(() => {})
  })
}

for (const level of ['Thư giãn', 'Cân bằng', 'Thử thách']) {
  test(`bot replies and undo restores the human turn: ${level}`, async ({ page }) => {
    await page.getByRole('button', { name: level, exact: true }).click()
    await move(page, 'e2', 'e4')
    await expect(page.getByTestId('move-count')).toHaveText('2', { timeout: 15000 })
    await page.getByRole('button', { name: 'Đi lại nước cờ', exact: true }).click()
    await expect(page.getByTestId('move-count')).toHaveText('0')
    await expect(page.locator('[data-square="e2"]')).toHaveAccessibleName('e2, Tốt trắng')
    await move(page, 'd2', 'd4')
    await expect(page.getByTestId('move-count')).toHaveText('2', { timeout: 15000 })
  })
}

test('bot opens as white and board follows the selected player color', async ({ page }) => {
  await page.getByRole('button', { name: 'Đen', exact: true }).click()
  await expect(page.getByTestId('move-count')).toHaveText('1')
  await expect(page.getByRole('button', { name: 'Đi lại nước cờ', exact: true })).toBeDisabled()
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('data-square', 'h1')
  await move(page, 'e7', 'e5')
  await expect(page.getByTestId('move-count')).toHaveText('3')
  await page.getByRole('button', { name: 'Đi lại nước cờ', exact: true }).click()
  await expect(page.getByTestId('move-count')).toHaveText('1')
})

test('undo during bot calculation cancels the pending reply', async ({ page }) => {
  await delayWorker(page)
  const worker = page.waitForEvent('worker')
  await move(page, 'e2', 'e4')
  await worker
  await page.getByRole('button', { name: 'Đi lại nước cờ', exact: true }).click()
  await expect(page.getByTestId('move-count')).toHaveText('0')
  await page.waitForTimeout(1000)
  await expect(page.getByTestId('move-count')).toHaveText('0')
})

test('changing difficulty during calculation restarts the real worker', async ({ page }) => {
  await delayWorker(page)
  const worker = page.waitForEvent('worker')
  await move(page, 'e2', 'e4')
  await worker
  await page.getByRole('button', { name: 'Thư giãn', exact: true }).click()
  await expect(page.getByTestId('move-count')).toHaveText('2')
  await page.waitForTimeout(800)
  await expect(page.getByTestId('move-count')).toHaveText('2')
})

test('opponent pieces cannot be dragged during the bot turn', async ({ page }) => {
  await delayWorker(page)
  await move(page, 'e2', 'e4')
  await expect(page.locator('.board-piece[draggable="true"]')).toHaveCount(0)
  await page.locator('[data-square="d5"]').evaluate((element) => {
    const transfer = new DataTransfer()
    transfer.setData('text/plain', 'd7')
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }))
  })
  await expect(page.getByTestId('move-count')).toHaveText('1')
  await expect(page.locator('[data-square="d7"]')).toHaveAccessibleName('d7, Tốt đen')
  await expect(page.getByTestId('move-count')).toHaveText('2')
})

test('new game preserves the position on cancel and cancels a pending worker on reset', async ({
  page,
}) => {
  await delayWorker(page)
  const worker = page.waitForEvent('worker')
  await move(page, 'e2', 'e4')
  await worker
  await page.getByRole('button', { name: 'Bắt đầu ván mới', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Tiếp tục ván hiện tại' }).click()
  await expect(page.locator('[data-square="e4"]')).toHaveAccessibleName('e4, Tốt trắng')
  await page.getByRole('button', { name: 'Bắt đầu ván mới', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Bắt đầu ván mới', exact: true })
    .click()
  await expect(page.getByTestId('move-count')).toHaveText('0')
  await page.waitForTimeout(1000)
  await expect(page.getByTestId('move-count')).toHaveText('0')
})

test('pass and play supports click, drag, flip and PGN export', async ({ page }) => {
  await friends(page)
  await move(page, 'e2', 'e4')
  await page.locator('[data-square="e7"] .board-piece').dragTo(page.locator('[data-square="e5"]'))
  await expect(page.getByTestId('move-count')).toHaveText('2')
  await page.getByRole('button', { name: 'Lật bàn cờ', exact: true }).click()
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('data-square', 'h1')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải biên bản PGN' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('gambit-van-co.pgn')
  expect(await readFile((await file.path())!, 'utf8')).toContain('1. e4 e5')
})

test('keyboard selection, arrow navigation and dialog focus restoration work', async ({ page }) => {
  await friends(page)
  await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1)
  await page.locator('[data-square="e2"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('data-valid', 'true')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-square="e4"]')).toHaveAccessibleName('e4, Tốt trắng')
  const help = page.getByRole('button', { name: 'Hướng dẫn chơi', exact: true }).last()
  await help.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(help).toBeFocused()
  await page.getByRole('button', { name: 'Chế độ tập trung', exact: true }).click()
  await expect(page.locator('.sidebar')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.locator('.sidebar')).toBeVisible()
})

test('board theme and sound preferences survive reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Vườn xanh', exact: true }).click()
  await page.getByRole('button', { name: 'Tắt âm thanh', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Vườn xanh', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Bật âm thanh', exact: true })).toBeVisible()
})

test('checkmate shows the result, allows review and undo', async ({ page }) => {
  await friends(page)
  for (const [from, to] of [
    ['e2', 'e4'],
    ['e7', 'e5'],
    ['d1', 'h5'],
    ['b8', 'c6'],
    ['f1', 'c4'],
    ['g8', 'f6'],
    ['h5', 'f7'],
  ])
    await move(page, from, to)
  await expect(page.getByRole('dialog')).toContainText('Quân trắng chiến thắng.')
  await page.getByRole('button', { name: 'Xem lại bàn cờ' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Đi lại nước cờ', exact: true }).click()
  await expect(page.getByTestId('move-count')).toHaveText('6')
})

test('castling moves the king and rook together', async ({ page }) => {
  await friends(page)
  for (const [from, to] of [
    ['e2', 'e4'],
    ['e7', 'e5'],
    ['g1', 'f3'],
    ['b8', 'c6'],
    ['f1', 'c4'],
    ['f8', 'c5'],
    ['e1', 'g1'],
  ])
    await move(page, from, to)
  await expect(page.locator('[data-square="g1"]')).toHaveAccessibleName('g1, Vua trắng')
  await expect(page.locator('[data-square="f1"]')).toHaveAccessibleName('f1, Xe trắng')
  await expect(page.locator('.history-scroll')).toContainText('O-O')
})

test('en passant removes the captured pawn', async ({ page }) => {
  await friends(page)
  for (const [from, to] of [
    ['e2', 'e4'],
    ['a7', 'a6'],
    ['e4', 'e5'],
    ['d7', 'd5'],
    ['e5', 'd6'],
  ])
    await move(page, from, to)
  await expect(page.locator('[data-square="d5"]')).toHaveAccessibleName('d5, ô trống')
  await expect(page.locator('[data-square="d6"]')).toHaveAccessibleName('d6, Tốt trắng')
})

test('promotion can be canceled and captures stay accurate after promotion', async ({ page }) => {
  await friends(page)
  for (const [from, to] of [
    ['a2', 'a4'],
    ['h7', 'h5'],
    ['a4', 'a5'],
    ['h5', 'h4'],
    ['a5', 'a6'],
    ['h4', 'h3'],
    ['a6', 'b7'],
    ['h3', 'g2'],
    ['b7', 'a8'],
  ])
    await move(page, from, to)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /^(Hậu|Xe|Tượng|Mã)$/ }),
  ).toHaveCount(4)
  await page.getByRole('button', { name: 'Hủy nước đi' }).click()
  await expect(page.getByTestId('move-count')).toHaveText('8')
  await move(page, 'b7', 'a8')
  await page.getByRole('button', { name: 'Hậu', exact: true }).click()
  await expect(page.locator('[data-square="a8"]')).toHaveAccessibleName('a8, Hậu trắng')
  await expect(page.locator('[title="1 Tốt trắng"]')).toHaveCount(1)
  await expect(page.locator('[title="1 Xe đen"]')).toHaveCount(1)
})

for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
]) {
  test(`responsive layout at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await expect(page.getByRole('gridcell')).toHaveCount(64)
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
    const board = await page.locator('.chess-board').boundingBox()
    expect(Math.abs(board!.width - board!.height)).toBeLessThan(1)
    if (width >= 1024) expect(board!.y + board!.height).toBeLessThan(height)
  })
}
