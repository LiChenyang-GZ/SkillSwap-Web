// 假的 @clerk/clerk-react，只在 Playwright 测试时使用（vite.config.ts 里：mode === 'e2e' 时把真 Clerk 换成这个文件）
//
// 为什么要假的：真的 Clerk 登录要连 Clerk 的服务器、要一个真的测试账号和密钥，CI 里很难稳定跑。
// 我们这两个测试想验证的是"前端拿到 role 之后，路由守卫对不对"，不是"Clerk 登录本身能不能用"，
// 所以把 Clerk 换成一个替身（fake），登录状态由测试自己决定。
// 另一种做法是 Clerk 官方的 @clerk/testing（用真的测试账号登录），更真实，但需要密钥和一个能连的后端，适合合并后再跑的完整 E2E。
import type { ReactNode } from 'react'; // 只用到类型

// 测试在打开页面前，用 page.addInitScript 往 window 上写 __E2E_AUTH__，告诉假 Clerk "现在有没有登录"
declare global {
  interface Window {
    __E2E_AUTH__?: { signedIn: boolean }; // 没写就当作没登录
  }
}

// 一个假的 JWT：三段用点隔开，中间一段是 base64 编码的 {"sub":"user_e2e"}
// 前端只会解码中间那段拿 sub（见 appAuthService.decodeJwtPayload），不会校验签名，所以第三段随便写
const FAKE_JWT = 'e2e.eyJzdWIiOiJ1c2VyX2UyZSJ9.signature';

const isSignedIn = () => window.__E2E_AUTH__?.signedIn === true; // 读测试设置的登录状态

// 真 Clerk 的 ClerkProvider 会连 Clerk 服务器；假的直接把子组件原样渲染出来
export function ClerkProvider({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

// 模仿 Clerk 的 useAuth()：AppContext 用它判断有没有登录、拿 token
export function useAuth() {
  return {
    isLoaded: true, // Clerk 已经加载完（真 Clerk 一开始是 false，要等网络）
    isSignedIn: isSignedIn(), // 有没有登录，由测试决定
    getToken: async () => (isSignedIn() ? FAKE_JWT : null), // 登录了就给假 token，后端请求会带上它（但后端也是测试假的）
    signOut: async () => { // 登出：清掉登录状态
      window.__E2E_AUTH__ = { signedIn: false };
    },
  };
}

// 模仿 Clerk 的 useUser()：AppContext 用它补全用户名和邮箱
export function useUser() {
  return {
    user: isSignedIn()
      ? { primaryEmailAddress: { emailAddress: 'e2e@example.com' }, fullName: 'E2E User', username: 'e2e_user' }
      : null, // 没登录就没有用户
  };
}

// 登录 / 注册页里用到的 Clerk 组件，测试里不会走到，给一个占位就行
export function SignIn() {
  return <div data-testid="fake-clerk-sign-in" />;
}

export function SignUp() {
  return <div data-testid="fake-clerk-sign-up" />;
}
