// Vitest 的配置文件。Vitest 是 Vite 项目里的"Jest"：API 几乎一样（describe / it / expect），但直接复用 Vite 的编译方式，所以更快、不用另配 Babel
import { defineConfig } from 'vitest/config'; // defineConfig：给配置对象加上类型提示
import react from '@vitejs/plugin-react-swc'; // 和 vite.config.ts 用同一个 React 插件，让测试能编译 .tsx
import path from 'path'; // Node 自带的路径工具，用来拼出 src 的绝对路径

export default defineConfig({
  plugins: [react()], // 让测试里的 JSX 能被编译
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }, // 和项目一样，让 "@/xxx" 指向 src/xxx
  },
  test: {
    environment: 'jsdom', // 用 jsdom 在 Node 里模拟一个浏览器（有 document、window），组件才能"渲染"出来
    setupFiles: ['./src/test/setup.ts'], // 每个测试文件运行前先执行这个文件（加载 jest-dom 断言、每次测完清理 DOM）
    include: ['src/**/*.test.{ts,tsx}'], // 只把 src 里的 *.test.ts(x) 当作组件/单元测试
    exclude: ['e2e/**', 'node_modules/**'], // e2e 文件夹是 Playwright 的，Vitest 不要去跑
  },
});
