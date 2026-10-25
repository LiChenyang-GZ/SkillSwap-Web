// 组件测试 2（业务规则）：Workshop 详情页的主按钮
// 测什么：同一个位置的按钮，会根据 workshop 的状态显示不同的文字、能不能点、点了调哪个函数
//         比如"满员了就不能报名"——后端也有这条规则（WorkshopServiceImplTest），这里测的是前端这一层的表现
// 属于哪一层：组件级单元测试。状态直接用 props 传进去，不碰后端
import { describe, it, expect, vi } from 'vitest'; // 测试框架的基本函数
import { render, screen } from '@testing-library/react'; // 渲染组件、在页面上找元素
import userEvent from '@testing-library/user-event'; // 模拟用户点击
import { WorkshopDetailsActionPanel } from './WorkshopDetailsActionPanel'; // 被测组件
import type { WorkshopDetailGuardState } from '../models/workshopDetailViewModel'; // 组件用的状态类型

// 测试数据工厂：先给一个"最普通"的状态（即将开始、没满、我不是主办方、我还没报名）
// 每个测试只覆盖自己关心的那一两个字段，读测试的人一眼就知道"这个测试的区别在哪"
function makeGuardState(overrides: Partial<WorkshopDetailGuardState> = {}): WorkshopDetailGuardState {
  return {
    isPending: false, // 不是待审核
    isRejected: false, // 没被拒绝
    isCancelled: false, // 没被取消
    isCompleted: false, // 还没结束
    isUpcoming: true, // 即将开始
    isOngoing: false, // 不在进行中
    isHost: false, // 我不是主办方
    isUserAttending: false, // 我还没报名
    isFull: false, // 没满员
    canViewRestricted: false, // 看不到限制信息（这个组件用不到）
    isAttendClosedByCutoff: false, // 报名没截止
    resolvedUserStatus: null, // 用户状态（这个组件用不到）
    ...overrides, // 用测试传进来的字段覆盖上面的默认值
  };
}

// 渲染辅助函数：每个回调都给一个假函数，测试结束后可以检查谁被调用了
function renderPanel(guardState: WorkshopDetailGuardState) {
  const handlers = {
    onAttend: vi.fn().mockResolvedValue(undefined), // 组件要求返回 Promise，所以让假函数返回一个已完成的 Promise
    onCancel: vi.fn().mockResolvedValue(undefined), // 同上
    onRequestApproval: vi.fn().mockResolvedValue(undefined), // 同上
    onViewMoreWorkshops: vi.fn(), // 这个是普通函数
  };
  render(<WorkshopDetailsActionPanel guardState={guardState} {...handlers} />); // 把状态和假函数传给组件
  return handlers; // 交给测试去做断言
}

describe('WorkshopDetailsActionPanel', () => {
  it('普通情况下显示 Attend Workshop，点击会调用 onAttend', async () => {
    const user = userEvent.setup(); // 虚拟用户
    const handlers = renderPanel(makeGuardState()); // Arrange：最普通的状态

    await user.click(screen.getByRole('button', { name: 'Attend Workshop' })); // Act：点报名

    expect(handlers.onAttend).toHaveBeenCalledTimes(1); // Assert：报名函数被调用了一次
    expect(handlers.onCancel).not.toHaveBeenCalled(); // 并且没有误调用"取消报名"
  });

  it('满员时显示禁用的 Workshop Full，没有可以点的报名按钮', () => {
    renderPanel(makeGuardState({ isFull: true })); // Arrange：只改一个字段——满员了

    expect(screen.getByRole('button', { name: 'Workshop Full' })).toBeDisabled(); // 显示"已满"，而且按钮是灰的
    // queryBy... 找不到时返回 null（getBy... 找不到会直接报错），专门用来断言"某个东西不存在"
    expect(screen.queryByRole('button', { name: 'Attend Workshop' })).not.toBeInTheDocument();
  });

  it('已经报名、workshop 还没开始时，显示 Cancel Attendance，点击会调用 onCancel', async () => {
    const user = userEvent.setup();
    const handlers = renderPanel(makeGuardState({ isUserAttending: true })); // Arrange：我已经报名了

    await user.click(screen.getByRole('button', { name: 'Cancel Attendance' })); // Act：点取消报名

    expect(handlers.onCancel).toHaveBeenCalledTimes(1); // Assert：取消函数被调用了
    expect(handlers.onAttend).not.toHaveBeenCalled(); // 并且没有再报一次名
  });

  it('优先级：workshop 被取消时，即使满员、我已报名，也只显示 Workshop Cancelled', () => {
    // Arrange：故意让几个状态同时为 true，检查组件的判断顺序（取消 > 其他所有状态）
    renderPanel(makeGuardState({ isCancelled: true, isFull: true, isUserAttending: true }));

    expect(screen.getByRole('button', { name: 'Workshop Cancelled' })).toBeDisabled(); // 只显示"已取消"
    expect(screen.queryByRole('button', { name: 'Cancel Attendance' })).not.toBeInTheDocument(); // 不会出现取消报名
    expect(screen.queryByRole('button', { name: 'Workshop Full' })).not.toBeInTheDocument(); // 也不会出现已满
  });
});
