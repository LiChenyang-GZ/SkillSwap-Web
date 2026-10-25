// 组件测试 3（安全规则）：Memory 页面的 Markdown 渲染器
// 测什么：admin 写的 Memory 文章支持 Markdown 和一部分 HTML（rehype-raw），但危险的 HTML 必须被过滤掉（rehype-sanitize）
//         否则别人可以在文章里塞 <script> 或 onerror，打开页面的人就会执行攻击者的 JS——这叫 XSS（跨站脚本攻击）
// 为什么重要：这是一个"安全回归测试"——证明不该能做的事做不了。以后谁把 rehypeSanitize 删了，这个测试会立刻变红
// 属于哪一层：组件级单元测试
import { describe, it, expect } from 'vitest'; // 测试框架
import { render, screen } from '@testing-library/react'; // 渲染组件、找元素
import { MemoryMarkdownRenderer } from './MemoryMarkdownRenderer'; // 被测组件

// 渲染辅助函数：组件有几个必填的 props，测试只关心 content，其他给固定值
function renderMarkdown(content: string) {
  return render( // 返回 render 的结果，测试里可以拿到 container（整个渲染出来的 DOM）
    <MemoryMarkdownRenderer
      content={content} // 要渲染的 Markdown 文本
      fallbackMarkdown="" // content 为空时显示的内容，这里用不到
      imageClassName="memory-img" // 图片的 class，这里用不到
    />
  );
}

describe('MemoryMarkdownRenderer', () => {
  it('正常的 Markdown 能正确渲染（先确认"好的输入"没有被误杀）', () => {
    renderMarkdown('## Workshop recap\n\nWe learned **React**.'); // Arrange + Act：一个二级标题和一段加粗文字

    expect(screen.getByRole('heading', { level: 2, name: 'Workshop recap' })).toBeInTheDocument(); // ## 变成了 <h2>
    expect(screen.getByText('React').tagName).toBe('STRONG'); // **React** 变成了 <strong>
  });

  it('<script> 标签会被删掉，不会出现在页面里', () => {
    // Arrange + Act：文章里藏了一段脚本
    const { container } = renderMarkdown('Hello\n\n<script>window.hacked = true</script>');

    expect(container.querySelector('script')).toBeNull(); // Assert：DOM 里找不到任何 <script>
    expect(screen.getByText('Hello')).toBeInTheDocument(); // 正常文字还在（只删坏的，不删好的）
  });

  it('文章里手写的 <iframe> 会被删掉（防止嵌入钓鱼页面）', () => {
    // Arrange + Act：攻击者想在文章里嵌一个假的登录页
    // 注意：组件自己会给 YouTube / Instagram 链接生成 iframe，那是安全的；这里测的是"作者手写的 HTML iframe"
    const { container } = renderMarkdown('<iframe src="https://evil.example/fake-login"></iframe>');

    expect(container.querySelector('iframe')).toBeNull(); // Assert：sanitize 的白名单里没有 iframe，所以被删掉
  });

  // 下面两条攻击，就算去掉 rehypeSanitize 也会被别的地方挡住（"改坏练习"时发现的）：
  // 它们测的是"多层防御"里的其他层，同样值得留着——以后谁改了那一层，测试会变红
  it('<img onerror="..."> 里的事件属性会被去掉，但图片本身保留', () => {
    // 挡住它的是组件里自定义的 img 渲染：只把 src / alt / width 传给 <img>，其他属性全部丢掉
    // Arrange + Act：这是最常见的 XSS 写法——图片加载失败时执行 onerror 里的代码
    const { container } = renderMarkdown('<img src="/cover.png" onerror="alert(1)" alt="cover">');

    const img = container.querySelector('img'); // 找到渲染出来的图片
    expect(img).not.toBeNull(); // Assert：图片还在
    expect(img).not.toHaveAttribute('onerror'); // 但 onerror 被去掉了
  });

  it('javascript: 开头的链接会被去掉 href，点了也不会执行代码', () => {
    // 挡住它的是 react-markdown 自带的 urlTransform：默认只允许 http、https、mailto 等安全协议
    // Arrange + Act：链接看起来正常，但 href 是一段 JS
    renderMarkdown('[click me](javascript:alert(1))');

    const link = screen.getByText('click me'); // 链接文字还在
    expect(link).not.toHaveAttribute('href', expect.stringContaining('javascript:')); // Assert：href 里不能有 javascript:
  });
});
