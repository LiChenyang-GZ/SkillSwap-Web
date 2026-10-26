// 单元测试 4（纯逻辑）：网址和"页面名"之间的互相转换
// 测什么：这个 App 没用 react-router，自己维护了一张表：网址 "/dashboard" ↔ 页面名 "dashboard"。
//         打开一个网址时用 pageFromPath 算出该显示哪个页面；切换页面时用 pathFromPage 算出地址栏该显示什么
// 属于哪一层：单元测试。纯函数（只有 resolvePostLoginPage 读了一下 window.location，jsdom 里有）
// 为什么要测：路由错了，用户刷新页面会跳到别的地方，分享出去的 workshop 链接会打不开
import { describe, it, expect, afterEach } from 'vitest'; // 测试框架
import {
  isAdminOnlyPage, // 是不是只有 admin 能进的页面
  isPublicPage, // 是不是不登录也能看的页面
  normalizePath, // 规整网址：去掉结尾的 /、去掉前后空格
  pageFromPath, // 网址 → 页面名
  pathFromPage, // 页面名 → 网址
  resolvePostLoginPage, // 登录完以后去哪个页面
  resolveRefreshModeByPage, // 不同页面刷新数据时拉多少数据
} from './appRoutes';

// 每个测试结束后把地址栏改回首页，避免影响下一个测试
afterEach(() => {
  window.history.pushState({}, '', '/'); // pushState：不刷新页面，只改地址栏（jsdom 也支持）
});

describe('normalizePath', () => {
  it.each([
    ['', '/'], // 空字符串 → 首页
    ['/', '/'], // 首页不变
    ['   ', '/'], // 只有空格 → 首页
    ['/explore/', '/explore'], // 去掉结尾的 /
    ['  /explore  ', '/explore'], // 去掉前后空格
    ['/explore', '/explore'], // 正常的不变
  ])('turns "%s" into "%s"', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe('pageFromPath', () => {
  it.each([
    ['/', 'hero'], // 首页
    ['/explore', 'explore'], // 浏览
    ['/campuses', 'campuses'], // 校区
    ['/create', 'create'], // 创建
    ['/dashboard', 'dashboard'], // 个人中心
    ['/memory', 'memory'], // 回忆墙
    ['/admin/memory', 'adminMemory'], // admin 管理回忆
    ['/admin/workshops', 'adminReview'], // admin 审核
    ['/notifications', 'notifications'], // 通知
    ['/auth', 'auth'], // 登录
    ['/onboarding', 'onboarding'], // 新用户引导
  ])('maps the known path %s to the page "%s"', (path, page) => {
    expect(pageFromPath(path)).toBe(page);
  });

  it('ignores one extra slash at the end', () => {
    // 用户手打 "/dashboard/" 也应该进个人中心，而不是被当成未知地址
    expect(pageFromPath('/dashboard/')).toBe('dashboard');
  });

  it('returns hero for an empty string', () => {
    expect(pageFromPath('')).toBe('hero'); // 空 → 规整成 "/" → 首页
  });

  it('returns explore for an unknown path', () => {
    expect(pageFromPath('/no-such-page')).toBe('explore'); // 不认识的地址 → 兜底到浏览页，不会白屏
  });

  it('is case-sensitive, so /Dashboard falls back to explore', () => {
    expect(pageFromPath('/Dashboard')).toBe('explore'); // 记录现状：大小写不同就不认识
  });

  it('reads the workshop id out of /workshops/<id>', () => {
    expect(pageFromPath('/workshops/42')).toBe('workshop-42'); // 页面名 = 前缀 + id
  });

  it('returns explore for /workshops/ with no id', () => {
    // 结尾的 / 被去掉后变成 "/workshops"，它不在路由表里 → 兜底到浏览页（而不是一个 id 为空的详情页）
    expect(pageFromPath('/workshops/')).toBe('explore');
  });

  it('reads a memory slug out of /memory/<slug>', () => {
    expect(pageFromPath('/memory/first-meetup')).toBe('memory-entry-first-meetup'); // 回忆详情页
  });
});

describe('pathFromPage', () => {
  it('maps a known page to its path', () => {
    expect(pathFromPage('dashboard')).toBe('/dashboard');
    expect(pathFromPage('hero')).toBe('/');
  });

  it('returns /explore for an unknown page', () => {
    expect(pathFromPage('no-such-page')).toBe('/explore'); // 和 pageFromPath 的兜底一致
  });

  it('URL-encodes characters in a workshop id', () => {
    // 空格、斜杠必须编码，否则斜杠会把网址切成多段
    expect(pathFromPage('workshop-a b/c')).toBe('/workshops/a%20b%2Fc');
  });
});

describe('round trip: page → path → page', () => {
  // 往返测试：先把页面名变成网址，再把网址变回页面名，应该和原来一模一样
  // 防的 bug：编码和解码不对称（比如一边 encode 了另一边忘了 decode），带特殊字符的链接分享出去就打不开
  it.each(['42', 'a b', 'a/b', '100%', 'a?b=1#c', '工作坊', 'workshop-7'])(
    'restores a workshop id "%s"',
    (id) => {
      const page = `workshop-${id}`; // 页面名
      expect(pageFromPath(pathFromPage(page))).toBe(page); // 转过去再转回来
    }
  );

  it.each(['trip', 'a b/c', '50%-off'])('restores a memory slug "%s"', (slug) => {
    const page = `memory-entry-${slug}`;
    expect(pageFromPath(pathFromPage(page))).toBe(page);
  });

  it.each(['hero', 'explore', 'campuses', 'create', 'dashboard', 'memory', 'adminMemory', 'notifications', 'adminReview', 'auth', 'onboarding'])(
    'restores the fixed page "%s"',
    (page) => {
      expect(pageFromPath(pathFromPage(page))).toBe(page);
    }
  );
});

describe('isPublicPage', () => {
  it.each(['hero', 'explore', 'campuses', 'memory', 'auth', 'workshop-42', 'memory-entry-trip'])(
    'treats %s as public (no login needed)',
    (page) => {
      expect(isPublicPage(page)).toBe(true); // workshop 详情和回忆详情是靠前缀判断的
    }
  );

  it.each(['create', 'dashboard', 'notifications', 'onboarding', 'adminReview', 'adminMemory', 'unknown'])(
    'requires login for %s',
    (page) => {
      expect(isPublicPage(page)).toBe(false); // 不认识的页面也当成"要登录"，更安全
    }
  );
});

describe('isAdminOnlyPage', () => {
  it('marks the two admin pages as admin-only', () => {
    expect(isAdminOnlyPage('adminReview')).toBe(true); // admin 审核
    expect(isAdminOnlyPage('adminMemory')).toBe(true); // admin 回忆管理
  });

  it('does not mark normal or unknown pages as admin-only', () => {
    expect(isAdminOnlyPage('dashboard')).toBe(false);
    expect(isAdminOnlyPage('workshop-1')).toBe(false);
    expect(isAdminOnlyPage('unknown')).toBe(false);
  });
});

describe('resolvePostLoginPage', () => {
  it('sends the user to explore after logging in from the home or auth page', () => {
    window.history.pushState({}, '', '/auth'); // 在登录页登录
    expect(resolvePostLoginPage()).toBe('explore'); // 不要停在登录页
    window.history.pushState({}, '', '/'); // 在首页登录
    expect(resolvePostLoginPage()).toBe('explore');
  });

  it('keeps the page the user originally asked for', () => {
    window.history.pushState({}, '', '/workshops/42'); // 用户点了一个分享的 workshop 链接，中途被要求登录
    expect(resolvePostLoginPage()).toBe('workshop-42'); // 登录完回到那个 workshop
  });
});

describe('resolveRefreshModeByPage', () => {
  it.each([
    ['explore', 'public'], // 浏览页只拉公开数据
    ['dashboard', 'dashboard'], // 个人中心拉自己的
    ['create', 'mine'], // 创建页拉我创建的
    ['adminReview', 'full'], // 其他页面拉全部
    ['workshop-1', 'full'],
  ])('uses "%s" → "%s"', (page, mode) => {
    expect(resolveRefreshModeByPage(page)).toBe(mode);
  });
});
