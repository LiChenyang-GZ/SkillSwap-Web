// 单元测试 5（纯逻辑 + 时间）：个人中心（dashboard）里的分页和"我主办的 workshop"状态
// 测什么：总页数怎么算、某一页取哪几条、这个 workshop 是不是我主办的、主办列表里每个 workshop 显示什么标签、能不能删
// 属于哪一层：单元测试。纯函数，不渲染。getHostingStatusMeta 内部直接 new Date() 读当前时间，所以用假时钟把"现在"固定住
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // 测试框架；beforeEach / afterEach：每个测试前 / 后都执行
import {
  buildDashboardWorkshopView, // 把所有 workshop 分到"即将参加 / 已参加 / 我主办"三个列表
  getHostingStatusMeta, // 主办列表里的标签（文字、颜色、能不能删）
  isHostedByCurrentUser, // 是不是我主办的
  paginateWorkshops, // 取某一页
  totalPages, // 总页数
} from './dashboardWorkshopUtils';
import type { Workshop } from '../../../types/workshop'; // workshop 类型
import type { User } from '../../../types/user'; // 用户类型

// 测试数据工厂：一个由用户 u1 主办、已通过审核、11 月 5 日 10:00 开始、60 分钟的 workshop
function makeWorkshop(overrides: Partial<Workshop> = {}): Workshop {
  return {
    id: 'w1', // id
    title: 'Pottery', // 用不到
    description: '', // 用不到
    category: 'Creative', // 用不到
    status: 'approved', // ⭐ 已通过
    date: '2026-11-05', // ⭐ 日期（在"现在"之后）
    time: '10:00', // ⭐ 时间
    duration: 60, // ⭐ 时长
    isOnline: false, // 用不到
    location: 'Room 1', // 用不到
    creditCost: 0, // 用不到
    creditReward: 0, // 用不到
    facilitator: { id: 'u1', name: 'Alice' }, // ⭐ 主办人是 u1
    ...overrides, // 覆盖
  };
}

// 当前登录用户 u1
const alice: User = {
  id: 'u1', // ⭐ 和上面 facilitator.id 一样
  username: 'alice',
  email: 'alice@example.com',
  skills: [],
  totalWorkshopsHosted: 0,
  totalWorkshopsAttended: 0,
  rating: 0,
  createdAt: '2026-01-01',
};

// 生成 n 个 id 不同的 workshop，用来测分页
const many = (n: number) => Array.from({ length: n }, (_, i) => makeWorkshop({ id: `w${i + 1}` }));

beforeEach(() => {
  vi.useFakeTimers(); // 假时钟
  vi.setSystemTime(new Date(2026, 10, 1, 12, 0)); // "现在"固定为本机时区 11 月 1 日 12:00（月份从 0 开始，10 = 11 月）
});

afterEach(() => {
  vi.useRealTimers(); // 换回真时钟
});

describe('totalPages', () => {
  it('is 1 when there are no items, so the pager never shows "page 1 of 0"', () => {
    expect(totalPages(0, 5)).toBe(1); // 防的 bug：Math.ceil(0/5)=0，没有 Math.max(1, ...) 就会显示"共 0 页"
  });

  it.each([
    [1, 1], // 1 条 → 1 页
    [5, 1], // 刚好一页
    [6, 2], // 多 1 条就要第 2 页
    [11, 3], // 11 条 → 3 页
  ])('gives %i items → %i pages with page size 5', (count, pages) => {
    expect(totalPages(count, 5)).toBe(pages);
  });
});

describe('paginateWorkshops', () => {
  const list = many(12); // 12 个 workshop，每页 5 个 → 5 + 5 + 2

  it('returns the first page', () => {
    expect(paginateWorkshops(list, 1, 5).map((w) => w.id)).toEqual(['w1', 'w2', 'w3', 'w4', 'w5']); // map：只取 id 来比较，看得清楚
  });

  it('returns the shorter last page', () => {
    expect(paginateWorkshops(list, 3, 5).map((w) => w.id)).toEqual(['w11', 'w12']); // 最后一页只有 2 个
  });

  it('returns an empty list for a page past the end', () => {
    expect(paginateWorkshops(list, 4, 5)).toEqual([]); // 第 4 页没有东西，不会报错
  });

  it('returns an empty list for page 0', () => {
    // 页码从 1 开始。传 0 时 slice(-5, 0) 是空数组
    // 注意：负数页码不会是空的（slice 负数从末尾数），但调用方 useDashboardPagination 用 Math.max(1, ...) 挡住了，所以这里不测负数
    expect(paginateWorkshops(list, 0, 5)).toEqual([]);
  });

  it('does not change the original list', () => {
    paginateWorkshops(list, 2, 5); // 取第 2 页
    expect(list).toHaveLength(12); // 原数组还是 12 个
  });
});

describe('isHostedByCurrentUser', () => {
  it('is false when nobody is logged in', () => {
    expect(isHostedByCurrentUser(makeWorkshop(), null)).toBe(false); // user 是 null → 不报错，返回 false
  });

  it('is false when the workshop has no facilitator', () => {
    expect(isHostedByCurrentUser(makeWorkshop({ facilitator: null }), alice)).toBe(false);
  });

  it('is false when the facilitator id is empty', () => {
    // 防的 bug：两边 id 都是空字符串时 "" === "" 为 true，会把别人的 workshop 当成我的
    expect(isHostedByCurrentUser(makeWorkshop({ facilitator: { id: '', name: 'X' } }), { ...alice, id: '' })).toBe(false);
  });

  it('matches a numeric id from the backend against a string user id', () => {
    // 后端有时给数字 7，有时给字符串 "7"。代码先都转成字符串再比
    const workshop = makeWorkshop({ facilitator: { id: 7 as unknown as string, name: 'Alice' } });
    expect(isHostedByCurrentUser(workshop, { ...alice, id: '7' })).toBe(true);
  });

  it('is false for another user', () => {
    expect(isHostedByCurrentUser(makeWorkshop(), { ...alice, id: 'u2' })).toBe(false);
  });
});

describe('getHostingStatusMeta', () => {
  // admin 状态直接决定标签。每一行：[admin 状态, 期望的标签对象]
  it.each([
    ['pending', { label: 'Pending', variant: 'secondary', removable: false }], // 待审核：不能删
    ['rejected', { label: 'Rejected', variant: 'destructive', removable: true }], // 被拒：可以从列表里删掉
    ['cancelled', { label: 'Cancelled', variant: 'destructive', removable: true }], // 被取消：可以删
    ['completed', { label: 'Completed', variant: 'outline', removable: false }], // 已结束：不能删
  ] as const)('shows %s with the matching label, colour and remove option', (status, meta) => {
    expect(getHostingStatusMeta(makeWorkshop({ status }))).toEqual(meta);
  });

  it('treats an unknown status as Pending', () => {
    expect(getHostingStatusMeta(makeWorkshop({ status: 'archived' as Workshop['status'] })).label).toBe('Pending');
  });

  it('shows Approved for a future approved workshop', () => {
    expect(getHostingStatusMeta(makeWorkshop())).toEqual({ label: 'Approved', variant: 'default', removable: false });
  });

  it.each(['upcoming', 'ongoing'] as const)('treats the admin status %s like approved', (status) => {
    expect(getHostingStatusMeta(makeWorkshop({ status })).label).toBe('Approved');
  });

  it('shows Completed once start + duration has passed', () => {
    // 10:00 开始、60 分钟 → 11:00 结束。"现在"是 12:00
    expect(getHostingStatusMeta(makeWorkshop({ date: '2026-11-01', time: '10:00' })).label).toBe('Completed');
  });

  it('switches to Completed exactly at the end time', () => {
    vi.setSystemTime(new Date(2026, 10, 1, 10, 59, 59)); // 结束前 1 秒
    expect(getHostingStatusMeta(makeWorkshop({ date: '2026-11-01' })).label).toBe('Approved');
    vi.setSystemTime(new Date(2026, 10, 1, 11, 0, 0)); // 刚好结束
    expect(getHostingStatusMeta(makeWorkshop({ date: '2026-11-01' })).label).toBe('Completed');
  });

  it('keeps Approved for a no-duration workshop that started earlier today', () => {
    // 没有时长 → 算不出结束时间。规则：只要还是同一天就当它还没结束
    expect(getHostingStatusMeta(makeWorkshop({ date: '2026-11-01', time: '09:00', duration: undefined })).label).toBe(
      'Approved'
    );
  });

  it('shows Completed for a no-duration workshop from a previous day', () => {
    // 没有时长、但已经是第二天了 → 当成结束
    expect(getHostingStatusMeta(makeWorkshop({ date: '2026-10-31', time: '09:00', duration: 0 })).label).toBe('Completed');
  });

  it('shows Approved when the date is missing or cannot be parsed', () => {
    expect(getHostingStatusMeta(makeWorkshop({ date: '' })).label).toBe('Approved'); // 没日期
    expect(getHostingStatusMeta(makeWorkshop({ date: 'soon' })).label).toBe('Approved'); // 日期乱写
  });
});

describe('buildDashboardWorkshopView', () => {
  it('returns empty lists when nobody is logged in', () => {
    const view = buildDashboardWorkshopView(many(3), null, []); // user 是 null
    expect(Object.values(view).every((list) => list.length === 0)).toBe(true); // 7 个列表全是空的
  });

  it('splits workshops into upcoming, attended and hosting, and hides what the host chose to hide', () => {
    const mineFuture = makeWorkshop({ id: 'mine-future' }); // 我主办、还没开始
    const minePast = makeWorkshop({ id: 'mine-past', date: '2026-10-01' }); // 我主办、已结束
    const mineHidden = makeWorkshop({ id: 'mine-hidden', hiddenByHost: true }); // 我主办、我在列表里隐藏了
    const mineHiddenLocally = makeWorkshop({ id: 'mine-hidden-local' }); // 我主办、刚刚在页面上点了隐藏（还没刷新）
    const otherFuture = makeWorkshop({ id: 'other-future', facilitator: { id: 'u2', name: 'Bob' } }); // 别人主办、还没开始
    const otherPending = makeWorkshop({ id: 'other-pending', status: 'pending', facilitator: { id: 'u2', name: 'Bob' } }); // 别人的、待审核

    const view = buildDashboardWorkshopView(
      [mineFuture, minePast, mineHidden, mineHiddenLocally, otherFuture, otherPending],
      alice,
      ['mine-hidden-local'] // 本地隐藏的 id 列表
    );

    const ids = (list: Workshop[]) => list.map((w) => w.id).sort(); // 只比较 id，排序后比较，不受顺序影响
    expect(ids(view.hostingWorkshops)).toEqual(['mine-future', 'mine-past']); // 主办列表：去掉两个隐藏的
    expect(ids(view.attendedWorkshops)).toEqual(['mine-past']); // 已结束的
    // 即将参加：隐藏只影响"主办"列表，所以两个隐藏的仍然在这里；别人待审核的看不到
    expect(ids(view.upcomingWorkshops)).toEqual(['mine-future', 'mine-hidden', 'mine-hidden-local', 'other-future']);
  });

  it('sorts upcoming workshops by start time, earliest first', () => {
    const later = makeWorkshop({ id: 'later', date: '2026-11-20' });
    const sooner = makeWorkshop({ id: 'sooner', date: '2026-11-03' });
    const noDate = makeWorkshop({ id: 'no-date', date: '' }); // 没日期的排最后
    const view = buildDashboardWorkshopView([later, noDate, sooner], alice, []);
    expect(view.sortedUpcomingWorkshops.map((w) => w.id)).toEqual(['sooner', 'later', 'no-date']);
  });
});
