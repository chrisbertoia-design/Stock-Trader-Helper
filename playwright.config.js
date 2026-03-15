import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],

  use: {
    baseURL: 'http://localhost:5175/Stock-Trader-Helper/',
    // Capture screenshot + trace only on failure
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Simulate mobile viewport (iPhone 14 Pro)
    viewport: { width: 393, height: 852 },
    // Touch events — matches iOS Chrome behavior
    hasTouch: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['iPhone 14 Pro'],
        channel: undefined,
        browserName: 'chromium',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],

  // Start dev server automatically before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5175/Stock-Trader-Helper/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
