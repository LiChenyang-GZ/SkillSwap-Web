// 单元测试 7（纯逻辑、数据转换）：shared/api.ts 里三个不发请求的小工具
// 测什么：
//   resolveAssetUrl：后端给的图片地址可能是完整 URL、也可能是 "/uploads/a.png" 这种相对路径，要统一成浏览器能打开的完整地址
//   toBackendWorkshopId：前端旧的假数据 id 是 "workshop-1"，发给后端前要变成 "1"
//   enrichWorkshop：把后端返回的原始 JSON（有时是蛇形命名 image_url，有时缺字段）整理成前端统一的 Workshop 对象
// 属于哪一层：单元测试。都是纯函数，不发网络请求、不 mock fetch
import { describe, it, expect } from 'vitest'; // 测试框架
import { API_BASE_URL, enrichWorkshop, resolveAssetUrl, toBackendWorkshopId } from './api'; // 被测函数 + 后端地址常量
// API_BASE_URL 来自 .env 里的 VITE_API_BASE_URL（没有就是 localhost:8080）。测试里直接引用它，不写死，换环境也能过

describe('resolveAssetUrl', () => {
  it('returns an empty string for a missing, empty or blank URL', () => {
    expect(resolveAssetUrl(undefined)).toBe(''); // 没有
    expect(resolveAssetUrl('')).toBe(''); // 空字符串
    expect(resolveAssetUrl('   ')).toBe(''); // 只有空格 → 不能拼成 "http://host/   "
  });

  it.each([
    'https://cdn.example.com/a.png', // 完整 https
    'http://cdn.example.com/a.png', // 完整 http
    'HTTPS://CDN.EXAMPLE.COM/A.PNG', // 大写协议也算
    '//cdn.example.com/a.png', // 省略协议的写法（跟随当前页面协议）
  ])('leaves the full URL %s unchanged', (url) => {
    expect(resolveAssetUrl(url)).toBe(url); // 防的 bug：给完整 URL 前面又拼了一次后端地址
  });

  it('prefixes a path that starts with / with the backend address', () => {
    expect(resolveAssetUrl('/uploads/a.png')).toBe(`${API_BASE_URL}/uploads/a.png`);
  });

  it('adds the missing / for a relative path without one', () => {
    expect(resolveAssetUrl('uploads/a.png')).toBe(`${API_BASE_URL}/uploads/a.png`); // 不会变成 "...8080uploads/a.png"
  });

  it('trims spaces around the URL first', () => {
    expect(resolveAssetUrl('  /uploads/a.png  ')).toBe(`${API_BASE_URL}/uploads/a.png`);
    expect(resolveAssetUrl('  https://x.com/a.png ')).toBe('https://x.com/a.png');
  });
});

describe('toBackendWorkshopId', () => {
  it('strips the "workshop-" prefix from an old mock id', () => {
    expect(toBackendWorkshopId('workshop-12')).toBe('12'); // 旧格式 → 纯数字
  });

  it.each([
    ['12', '12'], // 已经是数字 → 不变
    ['workshop-abc', 'workshop-abc'], // 前缀后面不是纯数字 → 不动
    ['workshop-12-extra', 'workshop-12-extra'], // 后面还有东西 → 不动（正则有 ^ 和 $，要求整段匹配）
    ['my-workshop-12', 'my-workshop-12'], // 前缀不在开头 → 不动
    ['3f2b-uuid', '3f2b-uuid'], // UUID 之类 → 不动
    ['', ''], // 空 → 空
  ])('leaves "%s" as "%s"', (input, expected) => {
    expect(toBackendWorkshopId(input)).toBe(expected);
  });
});

describe('enrichWorkshop', () => {
  // 一份"后端原始返回"，只放必需的字段；各测试再加自己关心的字段
  const raw = (extra: Record<string, unknown> = {}) => ({
    id: 42, // 后端给的是数字
    title: 'Pottery',
    category: 'Creative',
    status: 'approved',
    date: '2026-11-01',
    time: '10:00',
    ...extra,
  });

  it('turns a numeric id into a string', () => {
    expect(enrichWorkshop(raw()).id).toBe('42'); // 前端到处用字符串比较 id，必须统一
  });

  it('lower-cases the status', () => {
    expect(enrichWorkshop(raw({ status: 'APPROVED' })).status).toBe('approved'); // Java 枚举常是大写
  });

  it('reads snake_case fields from the backend', () => {
    // 不同接口有时用驼峰（imageUrl）、有时用蛇形（image_url），两种都要认
    const workshop = enrichWorkshop(
      raw({
        image_url: '/uploads/w.png',
        attend_close_at: '2026-10-31T12:00',
        week_number: 3,
        member_responsible: 'Bob',
        hidden_by_host: true,
        usu_approval_status: 'APPROVED',
        rejection_note: 'Too vague',
      })
    );
    expect(workshop).toMatchObject({
      image: `${API_BASE_URL}/uploads/w.png`, // 相对路径被补成完整地址
      attendCloseAt: '2026-10-31T12:00',
      weekNumber: 3,
      memberResponsible: 'Bob',
      hiddenByHost: true,
      usuApprovalStatus: 'approved', // 大写也认
      rejectionNote: 'Too vague',
    });
  });

  it('fills safe defaults for missing optional fields', () => {
    const workshop = enrichWorkshop(raw());
    expect(workshop.description).toBe(''); // 没有描述 → 空字符串，不是 undefined
    expect(workshop.location).toBe(''); // 没有地点 → 空字符串
    expect(workshop.facilitator).toBeNull(); // 没有主办人 → null
    expect(workshop.participants).toBeUndefined(); // 没有参与者列表 → undefined（表示"不知道"，不是"0 个人"）
    expect(workshop.currentParticipants).toBe(0); // 当前人数 → 0
    expect(workshop.usuApprovalStatus).toBe('pending'); // 默认 pending
    expect(workshop.eventSubmitted).toBe(false); // 转成布尔
    expect(workshop.rejectionNote).toBe(''); // 空字符串
  });

  it('keeps a reported participant count of 0 instead of replacing it', () => {
    // 代码用的是 ??（只有 null / undefined 才用后面的值），不是 ||（0 也会被替换）。防的 bug：有人改成 ||
    const workshop = enrichWorkshop(raw({ currentParticipants: 0, participants: [{ id: 1, username: 'a' }] }));
    expect(workshop.currentParticipants).toBe(0);
  });

  it('counts the participants list when no count is given', () => {
    const workshop = enrichWorkshop(raw({ participants: [{ id: 1 }, { id: 2 }] }));
    expect(workshop.currentParticipants).toBe(2);
  });

  it('normalises each participant: string id, fallback name and email, full avatar URL', () => {
    const [p] = enrichWorkshop(raw({ participants: [{ id: 7, user_email: 'p@x.com', avatar_url: '/a.png' }] }))
      .participants!; // ! 告诉 TypeScript：这里一定有值
    expect(p).toEqual({
      id: '7', // 数字 → 字符串
      username: 'Unknown', // 没有名字 → Unknown
      email: 'p@x.com', // 从 user_email 读
      avatarUrl: `${API_BASE_URL}/a.png`, // 头像补成完整地址
    });
  });

  it('builds the facilitator from username and resolves its avatar', () => {
    const workshop = enrichWorkshop(raw({ facilitator: { id: 'u1', username: 'alice', avatar_url: 'avatars/a.png' } }));
    expect(workshop.facilitator).toEqual({
      id: 'u1',
      name: 'alice', // username → name
      avatarUrl: `${API_BASE_URL}/avatars/a.png`, // 相对路径补全
      bio: undefined,
    });
  });

  it('uses a category picture when there is no image', () => {
    expect(enrichWorkshop(raw({ category: 'Technology' })).image).toContain('photo-1633356122544'); // Technology 的默认图
  });

  it('uses a generic picture for an unknown category', () => {
    expect(enrichWorkshop(raw({ category: 'Knitting' })).image).toContain('photo-1522202176988'); // 通用默认图
  });

  it('keeps a full image URL as it is', () => {
    expect(enrichWorkshop(raw({ image: 'https://cdn.x.com/w.png' })).image).toBe('https://cdn.x.com/w.png');
  });
});
