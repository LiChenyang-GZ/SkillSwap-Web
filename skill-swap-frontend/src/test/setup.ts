// 每个 Vitest 测试文件运行之前，都会先执行这个文件（在 vitest.config.ts 的 setupFiles 里登记）
import '@testing-library/jest-dom/vitest'; // 给 expect 加上 DOM 专用断言，比如 toBeInTheDocument()、toBeDisabled()
import { afterEach } from 'vitest'; // afterEach：每个测试结束后都执行一次的钩子
import { cleanup } from '@testing-library/react'; // cleanup：把上一个测试渲染出来的组件从 jsdom 里卸载掉

// jsdom 只模拟 DOM，不做排版，所以没有 ResizeObserver（浏览器用它监听元素大小变化）
// Radix 的 Checkbox / Switch 一渲染就会用它（表单在 <form> 里时要量一下按钮大小），没有就报错。这里补一个"什么都不做"的假版本
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {} // 开始监听：什么都不做
    unobserve() {} // 停止监听某个元素：什么都不做
    disconnect() {} // 停止所有监听：什么都不做
  };
}

afterEach(() => {
  cleanup(); // 每个测试结束后清空页面，保证测试之间互不影响（测试隔离），否则上一个测试的按钮会残留
});
