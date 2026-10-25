// Playwright 测试：admin 页面的访问控制（前端这一层）
//
// 规则：只有 admin 能打开 /admin/workshops。
// 后端已经有同一条规则的测试：SecurityRegressionTests（普通用户调 admin 接口 → 403）。
// 为什么前后端各测一层：
//   - 后端那层是真正的安全边界：就算前端被绕过，数据也拿不到
//   - 前端这层管用户体验：普通用户不应该看到一个空白或报错的 admin 页面，而是被礼貌地挡住、能回到正常页面
//   两层测的东西不同，少了任何一层，都可能有一种 bug 没人发现
//
// 这两个测试怎么"假"的：
//   - 登录：用 e2e/fakes/clerk-react.tsx 代替真 Clerk
//   - 后端：用 page.route 拦截所有 API 请求，返回我们写好的数据（role 是 member 还是 admin，由测试决定）
//   所以严格说这是"浏览器级的 UI 测试，后端是假的"，不是连真后端的完整 E2E。真浏览器、真路由、真 React 渲染都在。
import { test, expect, type Page } from '@playwright/test'; // test 写测试；expect 断言；Page 是浏览器标签页的类型

const API_ORIGIN = 'http://api.e2e.test'; // 和 playwright.config.ts 里的 VITE_API_BASE_URL 一样

// 辅助函数：让页面"以某个角色登录"，并把所有后端请求换成假数据
// 返回一个数组，记录页面请求过哪些 API，测试最后可以检查"有没有调用不该调用的接口"
async function signInAs(page: Page, role: 'member' | 'admin') {
  const apiCalls: string[] = []; // 记录请求过的 API 路径

  // addInitScript：在页面的任何 JS 运行之前先执行这段代码，相当于"打开网页前就已经登录好了"
  await page.addInitScript(() => {
    window.__E2E_AUTH__ = { signedIn: true }; // 告诉假 Clerk：已登录
  });

  // 拦截所有发往"后端"的请求（** 表示任意路径）
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname; // 只取路径部分，比如 /api/v1/users/me
    apiCalls.push(path); // 记下来

    if (path === '/api/v1/users/me') {
      // 前端靠这个接口返回的 role 判断是不是 admin（见 AppContext.fetchBackendUser）
      return route.fulfill({ // fulfill：不发真请求，直接返回我们写好的响应
        json: {
          id: 1, // 用户 id
          email: 'e2e@example.com', // 邮箱
          username: 'e2e_user', // 用户名（和假 Clerk 一致，前端就不会再发 PATCH 去改名）
          university: 'University of Sydney', // 必须有学校，否则前端会先跳去"选学校"的引导页
          role, // 关键字段：member 还是 admin，由测试传进来
        },
      });
    }

    if (path === '/api/v1/notifications/unread-count') {
      return route.fulfill({ json: { count: 0 } }); // 导航栏的未读通知数
    }

    return route.fulfill({ json: [] }); // 其他接口（workshop 列表等）一律返回空数组
  });

  // 拦截所有其他外部请求（比如 unsplash 的图片），直接中断：测试不依赖外网，跑得更快更稳定
  await page.route(
    (url) => url.hostname !== 'localhost' && url.origin !== API_ORIGIN, // 不是本地前端、也不是假后端的请求
    (route) => route.abort(), // 中断它
  );

  return apiCalls; // 交给测试做断言
}

test('普通用户打开 admin 页面，会被挡住，并能回到 Explore', async ({ page }) => { // { page }：Playwright 自动给每个测试一个全新的浏览器标签页
  // Arrange：以普通用户（member）登录
  const apiCalls = await signInAs(page, 'member');

  // Act：直接在地址栏输入 admin 页面的地址（模拟用户手动改 URL，绕过导航菜单）
  await page.goto('/admin/workshops');

  // Assert 1：看到"需要 admin 权限"的提示
  // getByRole('heading')：按"这是一个标题"来找，和用户/读屏软件看到的一样，不依赖 class 名
  // toBeVisible 会自动等待（默认最多 5 秒），不用自己写 sleep——这是 Playwright 防止测试不稳定的关键
  await expect(page.getByText('Admin Access Required')).toBeVisible();
  // 真正的 admin 页面标题不能出现
  await expect(page.getByRole('heading', { name: 'Workshop Administration' })).toHaveCount(0);

  // Assert 2：前端根本没有去请求 admin 接口（就算请求了后端也会 403，但前端不该浪费这次请求）
  expect(apiCalls.some((path) => path.startsWith('/api/v1/admin/'))).toBe(false);

  // Act 2：点"回到 Explore"按钮
  await page.getByRole('button', { name: 'Back to Explore' }).click();

  // Assert 3：地址栏变成 /explore，页面显示 Explore Workshops 的标题
  await expect(page).toHaveURL(/\/explore$/); // 正则：URL 以 /explore 结尾
  await expect(page.getByRole('heading', { name: 'Explore Workshops' })).toBeVisible();
});

test('admin 打开同一个地址，能看到管理页面（对照组）', async ({ page }) => {
  // 为什么要这个测试：如果只有上面那个，前端把所有人（包括 admin）都挡住，上面的测试照样会通过
  // 加一个"admin 能进"的对照组，才能证明挡住普通用户是因为 role，而不是页面本身坏了

  // Arrange：以 admin 登录
  const apiCalls = await signInAs(page, 'admin');

  // Act：打开同一个地址
  await page.goto('/admin/workshops');

  // Assert：看到真正的管理页面标题，没有看到"需要 admin 权限"
  await expect(page.getByRole('heading', { name: 'Workshop Administration' })).toBeVisible();
  await expect(page.getByText('Admin Access Required')).toHaveCount(0);

  // 并且前端确实去请求了 admin 接口（说明页面真的在工作，而不只是显示了一个标题）
  // expect.poll：反复检查，直到条件成立或超时——因为请求是异步发出的，标题出现时请求可能还没发
  await expect.poll(() => apiCalls.some((path) => path.startsWith('/api/v1/admin/workshops'))).toBe(true);
});
