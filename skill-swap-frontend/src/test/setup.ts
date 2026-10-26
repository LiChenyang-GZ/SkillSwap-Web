// 每个 Vitest 测试文件运行之前，都会先执行这个文件（在 vitest.config.ts 的 setupFiles 里登记）
import '@testing-library/jest-dom/vitest'; // 给 expect 加上 DOM 专用断言，比如 toBeInTheDocument()、toBeDisabled()
import { afterEach } from 'vitest'; // afterEach：每个测试结束后都执行一次的钩子
import { cleanup } from '@testing-library/react'; // cleanup：把上一个测试渲染出来的组件从 jsdom 里卸载掉

afterEach(() => {
  cleanup(); // 每个测试结束后清空页面，保证测试之间互不影响（测试隔离），否则上一个测试的按钮会残留
});
