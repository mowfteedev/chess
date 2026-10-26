import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command:
        'node_modules/.bin/supabase --agent no --output-format text functions serve chess-rooms',
      url: 'http://127.0.0.1:56321/functions/v1/chess-rooms',
      // `supabase start` can already serve this function in the isolated test stack.
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command:
        'npm run build -- --mode test && npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
})
