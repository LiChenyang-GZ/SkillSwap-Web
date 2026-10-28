// Hook 测试 1（带状态的流程）：回忆编辑器的"编辑锁"
// 测什么：两个 admin 同时打开同一篇草稿时，只能一个人编辑。打开草稿 → 向后端"抢锁"；每 60 秒"续锁"一次（心跳）；
//         关掉或切到别的文章 → "还锁"。抢不到（别人拿着，后端返回 423）→ 显示"被 xxx 锁住了"
// 属于哪一层：hook 测试。用 renderHook 把 hook 真的跑在 React 里（useEffect、useState、定时器都是真的）
// 哪些是假的：后端接口（memoryAdminService）和右下角弹窗（sonner 的 toast）。只假这两样，锁的判断逻辑全是真的
// 为什么最危险：锁没抢到却以为抢到了 → 两个人同时改，后保存的覆盖先保存的；锁没还 → 别人一直打不开
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // 测试框架
import { renderHook, act } from '@testing-library/react'; // renderHook：不写组件也能运行一个 hook；act：等 React 把状态更新做完
import { useMemoryStudioLocking } from './useMemoryStudioLocking'; // 被测 hook
import { memoryAdminService } from '../../../shared/service/memory/memoryAdminService'; // 会被下面的 vi.mock 替换成假的
import { toast } from 'sonner'; // 同上
import type { MemoryEntry } from '../../../types/memory'; // 类型

// vi.mock：把整个模块换成假的。Vitest 会把它提到文件最上面执行，所以 hook 里 import 到的也是假的
vi.mock('../../../shared/service/memory/memoryAdminService', () => ({
  memoryAdminService: {
    acquireLockByAdmin: vi.fn(), // 抢锁 / 续锁接口
    releaseLockByAdmin: vi.fn(), // 还锁接口
  },
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } })); // 弹窗：只记录被调用了几次、传了什么

const acquire = vi.mocked(memoryAdminService.acquireLockByAdmin); // vi.mocked：只是告诉 TypeScript "这是个假函数"，方便调用 .mockResolvedValue 等
const release = vi.mocked(memoryAdminService.releaseLockByAdmin);

const ME = 'u1'; // 当前登录的 admin
const HEARTBEAT_MS = 60_000; // 心跳间隔，和 MEMORY_LOCK_HEARTBEAT_MS 一样

// 测试数据工厂：一篇还没被任何人锁住的草稿
function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return { id: 'm1', title: 'Trip', slug: 'trip', mediaUrls: [], status: 'draft', ...overrides };
}

// 后端说"锁在 ownerId 手里"时返回的文章
const lockedBy = (entry: MemoryEntry, ownerId: string, ownerName?: string): MemoryEntry => ({
  ...entry,
  editLockOwnerId: ownerId,
  editLockOwnerName: ownerName,
});

// 后端抢锁失败时抛的错误：Error 的 message 是后端返回的 JSON，再挂一个 HTTP 状态码
const httpError = (status: number, message: string) => Object.assign(new Error(JSON.stringify({ message })), { status });

type Props = Parameters<typeof useMemoryStudioLocking>[0]; // hook 参数的类型

// 渲染辅助函数：给一套"正常"的参数，测试只覆盖需要的
function renderLocking(overrides: Partial<Props> = {}) {
  const props: Props = {
    isAuthenticated: true, // 已登录
    getAuthToken: vi.fn().mockResolvedValue('token'), // 拿 token 的函数：直接返回一个假 token
    currentUserId: ME, // 我是 u1
    selectedEntry: makeEntry(), // 选中了一篇草稿
    isCreatingNew: false, // 不是在新建
    onPatchEntry: vi.fn(), // 后端返回新数据时，hook 用它通知页面更新列表
    ...overrides,
  };
  // initialProps：第一次渲染用的参数；之后可以用 rerender(新参数) 模拟"用户切换了文章"
  const view = renderHook((p: Props) => useMemoryStudioLocking(p), { initialProps: props });
  return { ...view, props };
}

// 让所有已经完成的 Promise 把 then 里的代码跑完，并让 React 处理完状态更新
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

beforeEach(() => {
  vi.useFakeTimers(); // 假时钟：心跳的 setInterval 不会真的等 60 秒，由我们手动快进
  acquire.mockReset(); // 每个测试开始前清空假函数的调用记录和返回值
  release.mockReset().mockResolvedValue(undefined); // 还锁默认成功
  vi.mocked(toast.info).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  vi.useRealTimers(); // 换回真时钟
});

describe('useMemoryStudioLocking', () => {
  describe('acquiring the lock', () => {
    it('asks the backend for the lock as soon as a draft is opened, and remembers that it holds it', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), ME)); // 后端：锁给你了
      const { result, props } = renderLocking();
      await flush(); // 等抢锁的请求"返回"

      expect(acquire).toHaveBeenCalledWith('m1', 'token'); // 用这篇文章的 id 和 token 去抢锁
      expect(props.onPatchEntry).toHaveBeenCalledWith(lockedBy(makeEntry(), ME)); // 把后端返回的最新数据交给页面
      expect(result.current.heldLockEntryIdRef.current).toBe('m1'); // 记住"我手里拿着 m1 的锁"，离开时要还
      expect(result.current.lockMessage).toBeNull(); // 不显示"被锁住"
    });

    it('shows who holds the lock when the backend gives it to someone else', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), 'u2', 'Bob')); // 后端：锁在 Bob 手里
      const { result } = renderLocking();
      await flush();

      expect(result.current.lockMessage).toBe('This entry is currently locked by Bob.'); // 提示被 Bob 锁住
      expect(result.current.heldLockEntryIdRef.current).toBeNull(); // ⭐ 我没拿到锁，不能记成"我拿着"
    });

    it('says "another admin" when the lock owner has no name', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), 'u2')); // 没有名字
      const { result } = renderLocking();
      await flush();
      expect(result.current.lockMessage).toBe('This entry is currently locked by another admin.');
    });

    it('shows the server message and an info toast when the backend answers 423 Locked', async () => {
      // 423 是 HTTP 的 "Locked" 状态码：后端直接拒绝
      acquire.mockRejectedValue(httpError(423, 'Locked by Bob until 10:05')); // mockRejectedValue：让假函数返回一个失败的 Promise
      const { result } = renderLocking();
      await flush();

      expect(result.current.lockMessage).toBe('Locked by Bob until 10:05'); // 显示后端给的文字（从 JSON 里取出来）
      expect(toast.info).toHaveBeenCalledWith('Locked by Bob until 10:05'); // 第一次打开时弹一个提示
      expect(toast.error).not.toHaveBeenCalled(); // 423 是预期中的情况，不是"出错"，不弹红色错误
    });

    it('shows an error toast but no lock message for other failures', async () => {
      acquire.mockRejectedValue(httpError(500, 'Server exploded'));
      const { result } = renderLocking();
      await flush();

      expect(toast.error).toHaveBeenCalledWith('Server exploded'); // 红色错误
      expect(result.current.lockMessage).toBeNull(); // 不是锁的问题，不显示"被锁住"
    });

    it('does not call the backend when there is no token', async () => {
      const { result } = renderLocking({ getAuthToken: vi.fn().mockResolvedValue(null) }); // 拿不到 token
      await flush();
      expect(acquire).not.toHaveBeenCalled();
      expect(result.current.heldLockEntryIdRef.current).toBeNull();
    });
  });

  describe('when no lock is needed', () => {
    // 这几种情况不该去抢锁。每一行：[说明, 覆盖的参数]
    it.each<[string, Partial<Props>]>([
      ['the entry is published (read-only)', { selectedEntry: makeEntry({ status: 'published' }) }],
      ['the entry is archived', { selectedEntry: makeEntry({ status: 'archived' }) }],
      ['a new entry is being created', { isCreatingNew: true }],
      ['nothing is selected', { selectedEntry: null }],
      ['the user is logged out', { isAuthenticated: false }],
      ['the user id is unknown', { currentUserId: null }],
    ])('does not request a lock when %s', async (_label, overrides) => {
      renderLocking(overrides);
      await flush();
      await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_MS); }); // 再等一个心跳周期
      expect(acquire).not.toHaveBeenCalled(); // 一次都没抢
    });

    it('marks a published entry as read-only', () => {
      const { result } = renderLocking({ selectedEntry: makeEntry({ status: 'published' }) });
      expect(result.current.isReadOnlyEntry).toBe(true); // 已发布 → 只读
      expect(result.current.isDraftEntry).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('renews the lock every 60 seconds without toasts', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), ME));
      renderLocking();
      await flush();
      expect(acquire).toHaveBeenCalledTimes(1); // 打开时抢了一次

      await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1); }); // 快进到 59.999 秒
      expect(acquire).toHaveBeenCalledTimes(1); // 还没到时间

      acquire.mockRejectedValue(httpError(423, 'Locked by Bob')); // 这次续锁时，锁已经被 Bob 抢走了
      await act(async () => { await vi.advanceTimersByTimeAsync(1); }); // 刚好 60 秒
      expect(acquire).toHaveBeenCalledTimes(2); // 续了一次
      expect(toast.info).not.toHaveBeenCalled(); // 心跳是"安静模式"：不弹窗打扰用户
    });

    it('stops the heartbeat after the editor is closed', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), ME));
      const { unmount } = renderLocking();
      await flush();
      unmount(); // 关掉编辑器（组件卸载 → useEffect 的清理函数执行）

      await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3); }); // 再过 3 分钟
      expect(acquire).toHaveBeenCalledTimes(1); // 没有继续续锁。防的 bug：忘了 clearInterval，关掉页面后还在后台一直抢锁
    });
  });

  describe('releasing the lock', () => {
    it('releases the lock it holds when the editor is closed', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), ME));
      const { unmount } = renderLocking();
      await flush();
      unmount();
      await flush();
      expect(release).toHaveBeenCalledWith('m1', 'token'); // 还了 m1 的锁，别人才能编辑
    });

    it('does not release a lock that belongs to someone else', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), 'u2', 'Bob')); // 锁在 Bob 手里
      const { unmount } = renderLocking();
      await flush();
      unmount();
      await flush();
      expect(release).not.toHaveBeenCalled(); // ⭐ 不能把 Bob 的锁"还"掉，否则第三个人就能和 Bob 同时编辑
    });

    it('releases the old entry and locks the new one when switching entries', async () => {
      const a = makeEntry({ id: 'a' });
      const b = makeEntry({ id: 'b' });
      acquire.mockImplementation(async (id) => lockedBy(id === 'a' ? a : b, ME)); // mockImplementation：按参数返回不同结果
      const { rerender, props, result } = renderLocking({ selectedEntry: a });
      await flush(); // 拿到 a 的锁

      rerender({ ...props, selectedEntry: b }); // 用户在左边列表点了另一篇 b
      await flush();

      expect(release).toHaveBeenCalledWith('a', 'token'); // a 的锁还了
      expect(acquire).toHaveBeenLastCalledWith('b', 'token'); // 去抢 b 的锁
      expect(result.current.heldLockEntryIdRef.current).toBe('b'); // 现在手里拿的是 b
    });

    // bug D（已修）：以前清理函数跑的时候 a 的请求还没回来，不知道自己会拿到锁，于是不还；请求回来后锁就漏了
    //    修法：请求回来时先看 effect 是不是已经被清理（disposed），是的话由它自己把锁还掉
    it('releases the old entry even if the user switches away before its lock request returns (bug D)', async () => {
      let resolveA!: (entry: MemoryEntry) => void; // 先不让 a 的抢锁请求返回，手动控制它什么时候"到"
      acquire.mockImplementation((id) =>
        id === 'a'
          ? new Promise<MemoryEntry>((resolve) => { resolveA = resolve; }) // a：请求还在路上
          : Promise.resolve(lockedBy(makeEntry({ id: 'b' }), ME)) // b：马上返回
      );
      const a = makeEntry({ id: 'a' });
      const { rerender, props } = renderLocking({ selectedEntry: a });
      await flush(); // a 的请求已经发出去，但还没返回

      rerender({ ...props, selectedEntry: makeEntry({ id: 'b' }) }); // 用户手快，马上切到 b。这时清理函数执行，但还不知道自己会拿到 a 的锁
      await flush();
      await act(async () => { resolveA(lockedBy(a, ME)); await vi.advanceTimersByTimeAsync(0); }); // a 的请求这时才返回：后端已经把 a 锁给了我

      expect(release).toHaveBeenCalledWith('a', 'token'); // a 的锁也还掉了。修之前不会 → a 一直被我锁着，别人打不开，直到后端的锁过期
    });

    it('does not mark the old entry as held when its lock request returns after switching away', async () => {
      let resolveA!: (entry: MemoryEntry) => void; // 手动控制 a 的抢锁请求什么时候返回
      acquire.mockImplementation((id) =>
        id === 'a'
          ? new Promise<MemoryEntry>((resolve) => { resolveA = resolve; }) // a：请求还在路上
          : Promise.resolve(lockedBy(makeEntry({ id: 'b' }), ME)) // b：马上返回，锁给我
      );
      const a = makeEntry({ id: 'a' }); // 先打开的文章 a
      const { rerender, props, result } = renderLocking({ selectedEntry: a }); // 打开 a，发出抢锁请求
      await flush(); // a 的请求发出去了，还没返回

      rerender({ ...props, selectedEntry: makeEntry({ id: 'b' }) }); // 切到 b
      await flush(); // b 的锁已经拿到，手里记的是 b
      await act(async () => { resolveA(lockedBy(a, ME)); await vi.advanceTimersByTimeAsync(0); }); // a 的请求这时才回来

      expect(result.current.heldLockEntryIdRef.current).toBe('b'); // 手里记的还是 b。防的 bug：迟到的 a 把记录改成 a，之后离开 b 时就不会还 b 的锁
      expect(props.onPatchEntry).not.toHaveBeenCalledWith(lockedBy(a, ME)); // 迟到的结果不再更新页面（锁马上就要还掉了，不该显示"被我锁着"）
    });

    it('releases the lock if the editor is closed before the lock request returns', async () => {
      let resolveLock!: (entry: MemoryEntry) => void; // 手动控制抢锁请求什么时候返回
      acquire.mockImplementation(() => new Promise<MemoryEntry>((resolve) => { resolveLock = resolve; })); // 请求一直在路上
      const { unmount } = renderLocking(); // 打开草稿 m1
      await flush(); // 请求发出去了，还没返回

      unmount(); // 用户直接关掉了编辑器（组件卸载，清理函数执行，这时还不知道会拿到锁）
      await act(async () => { resolveLock(lockedBy(makeEntry(), ME)); await vi.advanceTimersByTimeAsync(0); }); // 请求这时才回来：后端把 m1 锁给了我

      expect(release).toHaveBeenCalledWith('m1', 'token'); // 组件已经没了，也要把 m1 的锁还掉，不然别人打不开
    });

    it('does not release the lock a newer visit holds when an older request for the same entry returns late (A → B → A)', async () => {
      const pendingA: Array<(entry: MemoryEntry) => void> = []; // 记下每一次抢 a 锁的请求，手动决定谁先回来
      const a = makeEntry({ id: 'a' }); // 文章 a
      const b = makeEntry({ id: 'b' }); // 文章 b
      acquire.mockImplementation((id) =>
        id === 'a'
          ? new Promise<MemoryEntry>((resolve) => { pendingA.push(resolve); }) // a：每次请求都先挂着
          : Promise.resolve(lockedBy(b, ME)) // b：马上返回
      );
      const { rerender, props, result } = renderLocking({ selectedEntry: a }); // 第一次打开 a（请求 1）
      await flush(); // 请求 1 还在路上

      rerender({ ...props, selectedEntry: b }); // 切到 b
      await flush(); // 拿到 b 的锁
      rerender({ ...props, selectedEntry: a }); // 又切回 a（请求 2），这时会还掉 b
      await flush(); // 请求 2 也在路上
      release.mockClear(); // 只关心接下来对 a 的还锁

      await act(async () => { pendingA[1](lockedBy(a, ME)); await vi.advanceTimersByTimeAsync(0); }); // 请求 2 先回来：现在这次打开 a 拿到了锁
      await act(async () => { pendingA[0](lockedBy(a, ME)); await vi.advanceTimersByTimeAsync(0); }); // 请求 1 迟到

      expect(result.current.heldLockEntryIdRef.current).toBe('a'); // 手里拿着 a 的锁
      expect(release).not.toHaveBeenCalledWith('a', 'token'); // 迟到的请求 1 不能把当前正在用的 a 锁还掉，否则另一个 admin 能同时编辑
    });
  });

  describe('derived flags', () => {
    it('reports locked by me / by other from the entry owner', () => {
      expect(renderLocking({ selectedEntry: lockedBy(makeEntry(), ME) }).result.current).toMatchObject({
        isLockedByMe: true,
        isLockedByOther: false,
      });
      expect(renderLocking({ selectedEntry: lockedBy(makeEntry(), 'u2') }).result.current).toMatchObject({
        isLockedByMe: false,
        isLockedByOther: true,
      });
    });

    it('never reports a published entry as locked, even if an owner is set', () => {
      // 锁只对草稿有意义：已发布的文章本来就只读
      const { result } = renderLocking({ selectedEntry: lockedBy(makeEntry({ status: 'published' }), 'u2') });
      expect(result.current.isLockedByOther).toBe(false);
    });

    it('clearLockState wipes the message and the held lock', async () => {
      acquire.mockResolvedValue(lockedBy(makeEntry(), 'u2', 'Bob'));
      const { result } = renderLocking();
      await flush();
      act(() => result.current.clearLockState()); // 页面在切换模式时会调用它
      expect(result.current.lockMessage).toBeNull();
      expect(result.current.heldLockEntryIdRef.current).toBeNull();
    });
  });
});
