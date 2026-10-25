// Playwright 的配置文件。Playwright 会真的打开一个浏览器（Chromium），像真人一样访问页面、点击、检查结果
import { defineConfig, devices } from '@playwright/test'; // defineConfig 给类型提示；devices 是预设好的浏览器/设备参数

const PORT = 4173; // 测试专用端口，避免和平时 npm run dev 的 3000 冲突

export default defineConfig({
  testDir: './e2e', // 只在 e2e 文件夹里找测试
  fullyParallel: true, // 不同测试可以同时跑（每个测试都有自己独立的浏览器上下文，互不影响）
  forbidOnly: !!process.env.CI, // 在 CI 里如果有人忘了删 test.only，直接报错（否则只跑一个测试还显示通过）
  retries: process.env.CI ? 1 : 0, // CI 上失败自动重试 1 次，减少偶发的不稳定；本地不重试，问题立刻暴露
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list', // CI 里用 GitHub 格式（错误会标在 PR 上），同时生成 HTML 报告（失败时上传）；本地用列表格式
  use: {
    baseURL: `http://localhost:${PORT}`, // 测试里写 page.goto('/admin/workshops') 就会访问这个地址
    trace: 'on-first-retry', // 第一次重试时录下完整过程（每一步的截图、网络请求），方便排查失败原因
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, // 只用桌面版 Chrome 跑；需要的话可以再加 firefox、webkit
  ],
  webServer: {
    // 跑测试前，Playwright 会先自动启动前端开发服务器
    // --mode e2e：让 vite.config.ts 把真 Clerk 换成 e2e/fakes/clerk-react.tsx
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`, // 等这个地址能打开了，才开始跑测试
    reuseExistingServer: !process.env.CI, // 本地如果已经开着，就直接复用，省时间
    timeout: 120_000, // 最多等 2 分钟让服务器启动
    env: {
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_e2e_fake', // main.tsx 没有这个变量会直接报错；假 Clerk 不会用它，随便给一个
      // 后端地址指向一个不存在的域名：所有请求都会被测试里的 page.route 拦下来返回假数据，绝对不会打到真后端
      VITE_API_BASE_URL: 'http://api.e2e.test',
    },
  },
});
