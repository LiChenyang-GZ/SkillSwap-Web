// 组件测试 1（入门）：Dashboard 的分页条
// 测什么：给不同的 props，组件显示得对不对；点按钮时有没有把正确的页码告诉父组件
// 属于哪一层：组件级"单元测试"。只渲染这一个组件，不启动整个 App，不连后端
import { describe, it, expect, vi } from 'vitest'; // describe 分组、it 写一个测试、expect 断言、vi 造假函数（相当于 Jest 的 jest）
import { render, screen } from '@testing-library/react'; // render 把组件渲染到 jsdom；screen 用来在页面上找元素
import userEvent from '@testing-library/user-event'; // userEvent 模拟真人的点击、打字（比 fireEvent 更像真实用户）
import { DashboardPagination } from './DashboardPagination'; // 被测的组件

describe('DashboardPagination', () => { // 一组测试，名字就是被测组件
  it('只有 1 页时什么都不显示', () => { // 每个 it 说清楚"在什么情况下，应该怎样"
    // Arrange + Act：一共 1 页，渲染组件；onPageChange 给一个假函数，这里用不到
    const { container } = render(<DashboardPagination currentPage={1} pageCount={1} onPageChange={vi.fn()} />);
    // Assert：组件 return null，所以容器里应该是空的
    expect(container).toBeEmptyDOMElement();
  });

  it('在第 1 页时 Previous 按钮是禁用的，Next 可以点', () => {
    // Arrange + Act：一共 3 页，当前第 1 页
    render(<DashboardPagination currentPage={1} pageCount={3} onPageChange={vi.fn()} />);
    // Assert：按"角色 + 名字"找按钮，这是用户能看到的东西，不依赖 class 名，重构样式也不会坏
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled(); // 第一页不能再往前
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled(); // 还能往后
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument(); // 页码文字显示正确
  });

  it('点 Next 时，把"当前页 + 1"告诉父组件', async () => { // 有用户交互，交互是异步的，所以用 async
    // Arrange：准备一个假函数（mock），它会记录自己被调用了几次、传了什么参数
    const onPageChange = vi.fn();
    const user = userEvent.setup(); // 创建一个"虚拟用户"
    render(<DashboardPagination currentPage={2} pageCount={3} onPageChange={onPageChange} />);

    // Act：用户点 Next
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Assert：组件自己不改页码，而是通知父组件，所以检查"父组件收到的参数"
    expect(onPageChange).toHaveBeenCalledTimes(1); // 只调用了一次
    expect(onPageChange).toHaveBeenCalledWith(3); // 参数是 3（第 2 页 + 1）
  });
});
