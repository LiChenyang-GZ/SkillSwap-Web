// 单元测试 1（纯逻辑、和时间有关）：workshop 的状态规则
// 测什么：后端给的"admin 状态"（pending / approved / ...）+ 日期、时间、时长 → 算出用户看到的状态（upcoming / ongoing / completed），或者"用户看不到"（null）
// 属于哪一层：单元测试。被测的是纯函数：输入一个 workshop 对象和"现在几点"，输出一个状态。不渲染组件、不 mock 任何东西
// 时间怎么处理：所有"现在"都是测试里写死的固定时间，不读电脑当前时间，所以今天跑和明年跑结果一样
// 时区怎么处理：被测代码把 "2026-11-01" + "10:00" 当成"本机时区的 10 点"，所以测试里也用本机时区的构造方式 new Date(年, 月, 日, 时, 分)，
//             两边用同一个时区，在悉尼、北京、CI 的 UTC 机器上跑结果都一样
import { describe, it, expect, vi, afterEach } from 'vitest'; // 测试框架；vi 用来控制假时钟
import {
  normalizeAdminWorkshopStatus, // 被测函数 1：把后端的状态字符串规整成 7 个合法值之一
  resolveUserWorkshopStatus, // 被测函数 2：算出用户看到的状态
  isUserWorkshopVisible, // 被测函数 3：用户能不能看到这个 workshop
} from './workshopStatusRules';
import type { Workshop } from '../../../types/workshop'; // workshop 的类型

// 本机时区的某个时刻。注意 JS 的月份从 0 开始：10 表示 11 月
const local = (day: number, hour: number, minute = 0, ms = 0) => new Date(2026, 10, day, hour, minute, 0, ms);

// 测试数据工厂：一个"普通的"已通过审核的 workshop，11 月 1 日 10:00 开始，持续 60 分钟
// 每个测试只覆盖自己关心的字段（和第 1 轮 makeGuardState 一样的写法）
function makeWorkshop(overrides: Partial<Workshop> = {}): Workshop {
  return {
    id: '1', // id 随便给
    title: 'Intro to Pottery', // 标题，这组测试用不到
    description: '', // 描述，用不到
    category: 'Creative', // 类别，用不到
    status: 'approved', // ⭐ admin 状态：已通过
    date: '2026-11-01', // ⭐ 日期
    time: '10:00', // ⭐ 开始时间（HH:mm）
    duration: 60, // ⭐ 时长（分钟）
    isOnline: false, // 用不到
    location: 'Room 101', // 用不到
    creditCost: 0, // 用不到
    creditReward: 0, // 用不到
    facilitator: null, // 用不到
    ...overrides, // 用测试传进来的字段覆盖默认值
  };
}

// 每个测试结束后把假时钟换回真时钟，避免影响别的测试（测试隔离）
afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeAdminWorkshopStatus', () => {
  // it.each：同一个测试用一张表跑很多次，每一行数据跑一遍；%s 会被替换成这一行的值，出现在测试名里
  it.each(['pending', 'approved', 'rejected', 'cancelled', 'completed', 'upcoming', 'ongoing'])(
    'keeps the known status "%s" unchanged',
    (status) => {
      expect(normalizeAdminWorkshopStatus(status)).toBe(status); // 合法值原样返回
    }
  );

  it('lower-cases an upper-case status from the backend', () => {
    expect(normalizeAdminWorkshopStatus('APPROVED')).toBe('approved'); // 后端如果返回大写（Java 枚举常见），也能认出来
  });

  it('treats a missing or empty status as pending', () => {
    expect(normalizeAdminWorkshopStatus(undefined)).toBe('pending'); // 没有状态 → 当成待审核
    expect(normalizeAdminWorkshopStatus('')).toBe('pending'); // 空字符串 → 同上
  });

  it('falls back to pending for an unknown status instead of passing it through', () => {
    // 防的 bug：后端以后加了新状态（比如 archived），前端不认识，如果原样放过去，后面的 if 都匹配不上，可能被当成正常的 workshop 展示
    expect(normalizeAdminWorkshopStatus('archived')).toBe('pending'); // 不认识 → 最保守的 pending（用户看不到）
  });

  it('does not trim spaces, so " approved " is treated as unknown (pending)', () => {
    // 记录现状：函数只做了小写，没做 trim。后端不会返回带空格的值，所以目前不是问题；以后有人加 trim，这条测试会提醒他行为变了
    expect(normalizeAdminWorkshopStatus(' approved ')).toBe('pending');
  });
});

describe('resolveUserWorkshopStatus', () => {
  describe('time windows (start 10:00, 60 minutes)', () => {
    it('returns upcoming one millisecond before the start', () => {
      // 边界值：开始前 1 毫秒，还没开始
      expect(resolveUserWorkshopStatus(makeWorkshop(), local(1, 9, 59, 999))).toBe('upcoming');
    });

    it('returns ongoing exactly at the start time', () => {
      // 边界值：刚好 10:00:00.000。代码用的是 now >= start，所以算"进行中"
      expect(resolveUserWorkshopStatus(makeWorkshop(), local(1, 10))).toBe('ongoing');
    });

    it('returns ongoing one millisecond before the end', () => {
      // 边界值：10:59:59.999，还差 1 毫秒结束
      expect(resolveUserWorkshopStatus(makeWorkshop(), local(1, 10, 59, 999))).toBe('ongoing');
    });

    it('returns completed exactly at the end time', () => {
      // 边界值：刚好 11:00，代码用的是 now >= end，所以算"已结束"。防的 bug：有人把 >= 改成 >，结束那一刻会多显示一下"进行中"
      expect(resolveUserWorkshopStatus(makeWorkshop(), local(1, 11))).toBe('completed');
    });

    it('accepts a time with seconds (HH:mm:ss) the same way as HH:mm', () => {
      // 后端的 LocalTime 有时序列化成 "10:00:00"，长度是 8，不会再补 ":00"
      const workshop = makeWorkshop({ time: '10:00:00' });
      expect(resolveUserWorkshopStatus(workshop, local(1, 9, 59))).toBe('upcoming'); // 开始前
      expect(resolveUserWorkshopStatus(workshop, local(1, 10))).toBe('ongoing'); // 开始那一刻
    });

    it('uses only the date part when the date comes as an ISO timestamp', () => {
      // 后端有时把日期给成 "2026-11-01T00:00:00Z"，代码只取 T 前面的日期，再拼上 time
      const workshop = makeWorkshop({ date: '2026-11-01T00:00:00Z' });
      expect(resolveUserWorkshopStatus(workshop, local(1, 9, 59))).toBe('upcoming'); // 仍然是本机 10 点开始
      expect(resolveUserWorkshopStatus(workshop, local(1, 10, 30))).toBe('ongoing'); // 10:30 在进行中
    });
  });

  describe('admin status decides first', () => {
    it('returns completed for an admin-completed workshop even if its date is in the future', () => {
      // 优先级：admin 已经标记"结束"，就不再看时间。防的 bug：把 completed 的判断挪到时间判断后面
      const workshop = makeWorkshop({ status: 'completed', date: '2030-01-01' });
      expect(resolveUserWorkshopStatus(workshop, local(1, 9))).toBe('completed');
    });

    it('returns completed for an admin-completed workshop with no date at all', () => {
      expect(resolveUserWorkshopStatus(makeWorkshop({ status: 'completed', date: '' }), local(1, 9))).toBe('completed');
    });

    // 这三种状态普通用户都不应该看到
    it.each(['pending', 'rejected', 'cancelled'] as const)('hides a %s workshop from users (returns null)', (status) => {
      const workshop = makeWorkshop({ status });
      expect(resolveUserWorkshopStatus(workshop, local(1, 10, 30))).toBeNull(); // 即使时间上"正在进行"，也看不到
      expect(isUserWorkshopVisible(workshop, local(1, 10, 30))).toBe(false); // 对应的布尔版本也是 false
    });

    it('hides a workshop whose status the frontend does not recognise', () => {
      // 不认识的状态 → 先被规整成 pending → 用户看不到
      const workshop = makeWorkshop({ status: 'archived' as Workshop['status'] }); // as：故意塞一个类型里没有的值
      expect(resolveUserWorkshopStatus(workshop, local(1, 10, 30))).toBeNull();
    });

    it.each(['approved', 'upcoming', 'ongoing'] as const)('shows a %s workshop to users', (status) => {
      // 这三种是用户能看到的状态，时间在开始之前 → upcoming
      expect(isUserWorkshopVisible(makeWorkshop({ status }), local(1, 9))).toBe(true);
    });
  });

  describe('missing or broken date / time', () => {
    it('returns upcoming when the date is empty, because there is no start to compare with', () => {
      expect(resolveUserWorkshopStatus(makeWorkshop({ date: '' }), local(1, 12))).toBe('upcoming'); // 没日期 → 默认"即将开始"
    });

    it('keeps an admin-ongoing workshop as ongoing when the date cannot be parsed', () => {
      // 日期格式不对 → 拼不出时间，也解析不出日期 → 只能相信 admin 状态
      expect(resolveUserWorkshopStatus(makeWorkshop({ status: 'ongoing', date: 'not-a-date' }), local(1, 12))).toBe('ongoing');
      expect(resolveUserWorkshopStatus(makeWorkshop({ status: 'approved', date: 'not-a-date' }), local(1, 12))).toBe('upcoming');
    });

    it('starts at UTC midnight when there is a date but no time', () => {
      // 只有日期没有时间：代码走 new Date("2026-11-01")，JS 规定这种纯日期按 UTC 午夜解析（不是本机午夜）
      // 所以这里用 Date.UTC 构造"现在"，不管本机在哪个时区，结果都一样
      const workshop = makeWorkshop({ time: '' });
      expect(resolveUserWorkshopStatus(workshop, new Date(Date.UTC(2026, 10, 1, 0, 0) - 1))).toBe('upcoming'); // UTC 午夜前 1 毫秒
      expect(resolveUserWorkshopStatus(workshop, new Date(Date.UTC(2026, 10, 1, 0, 0)))).toBe('ongoing'); // UTC 午夜那一刻开始
      expect(resolveUserWorkshopStatus(workshop, new Date(Date.UTC(2026, 10, 1, 1, 0)))).toBe('completed'); // 60 分钟后结束
    });

    it('ignores a time like "9:00" (single-digit hour) and falls back to the date alone', () => {
      // "9:00" 长度是 4，不会补 ":00"，拼出来的 "2026-11-01T9:00" 不是合法格式 → 退回只用日期（UTC 午夜）
      // 记录现状：时间输入框（type="time"）和后端都给两位小时，所以实际不会出现；但如果出现，会悄悄按午夜算
      const workshop = makeWorkshop({ time: '9:00' });
      expect(resolveUserWorkshopStatus(workshop, new Date(Date.UTC(2026, 10, 1, 0, 30)))).toBe('ongoing'); // UTC 00:30 已经"开始"了
    });
  });

  describe('duration that cannot give an end time', () => {
    // 时长是 0、负数、没有、不是数字 → 算不出结束时间
    it.each([
      ['zero', 0],
      ['negative', -30],
      ['missing', undefined],
      ['not a number', 'abc' as unknown as number], // 故意塞一个字符串，模拟后端给了脏数据
    ])('stays ongoing long after the start when the duration is %s', (_label, duration) => {
      const workshop = makeWorkshop({ duration });
      expect(resolveUserWorkshopStatus(workshop, local(1, 9))).toBe('upcoming'); // 开始前还是"即将开始"
      // 一个月以后仍然是"进行中"：没有结束时间，就永远不会自动变成 completed（记录现状，见 PR 说明）
      expect(resolveUserWorkshopStatus(workshop, new Date(2026, 11, 1, 10))).toBe('ongoing');
    });
  });

  it('uses the current clock when no "now" is passed in', () => {
    vi.useFakeTimers(); // 换成假时钟：之后 new Date() 返回我们设定的时间
    vi.setSystemTime(local(1, 10, 30)); // 把"现在"设成 11 月 1 日 10:30
    expect(resolveUserWorkshopStatus(makeWorkshop())).toBe('ongoing'); // 不传 now，函数自己 new Date()，拿到的是假时间
    vi.setSystemTime(local(1, 11, 30)); // 时钟拨到 11:30
    expect(resolveUserWorkshopStatus(makeWorkshop())).toBe('completed'); // 已经结束
  });
});
