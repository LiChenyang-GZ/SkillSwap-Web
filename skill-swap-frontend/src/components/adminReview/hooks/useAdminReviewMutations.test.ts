// Hook 测试 2（带状态的流程）：admin 审核 workshop —— 通过 / 驳回 / 取消 / 改字段保存
// 测什么：admin 点了按钮以后，hook 有没有用对的参数调后端、成功后列表里的状态有没有更新、失败时弹什么提示
//         特别是 409（别的 admin 刚改过，版本号对不上）：不能假装成功，也不能把 admin 还没保存的修改冲掉
// 属于哪一层：hook 测试（renderHook）。假的：后端接口 adminWorkshopService、toast 弹窗、页面传进来的回调；hook 里的流程是真的
import { describe, it, expect, vi, beforeEach } from 'vitest'; // 测试框架
import { renderHook, act } from '@testing-library/react'; // 运行 hook；act 等状态更新完成
import { useAdminReviewMutations } from './useAdminReviewMutations'; // 被测 hook
import { adminWorkshopService } from '../../../shared/service/workshop/adminWorkshopService'; // 下面会被换成假的
import { toast } from 'sonner'; // 同上
import { emptyWorkshopForm, type WorkshopFormState } from '../models/adminReviewFormModel'; // 表单
import type { Workshop } from '../../../types/workshop'; // 类型

// 把后端接口整个换成假的：每个方法都是 vi.fn()，测试里决定它返回什么
vi.mock('../../../shared/service/workshop/adminWorkshopService', () => ({
  adminWorkshopService: { approve: vi.fn(), reject: vi.fn(), cancel: vi.fn(), update: vi.fn(), uploadImage: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } })); // 弹窗也换成假的

const service = vi.mocked(adminWorkshopService); // 方便 TypeScript 认出这些是假函数

// 一个待审核的 workshop，版本号 3（乐观锁：保存时带上版本号，后端发现版本不对就返回 409）
const pending: Workshop = {
  id: 'w1', title: 'Pottery', description: '', category: 'Creative', status: 'pending',
  date: '2099-01-01', time: '10:00', duration: 60, isOnline: false, location: 'Room 1',
  creditCost: 0, creditReward: 0, facilitator: null, version: 3,
};
const other: Workshop = { ...pending, id: 'w2', title: 'Other' }; // 列表里的另一个，用来检查"只改了 w1"

// 一份合法的表单（admin 正在编辑的内容）
const validForm: WorkshopFormState = {
  ...emptyWorkshopForm,
  hostName: 'Alice', title: 'Pottery 2', category: 'Creative', contactNumber: '0412 345 678',
  date: '2099-01-01', time: '10:00', duration: '90', maxParticipants: '12', weekNumber: '4',
  attendCloseAt: '2098-12-31T18:00', location: 'Room 2',
};

// 409 冲突错误：和真实的 apiCall 一样，是一个带 status 的 Error
const conflict = () => Object.assign(new Error('{"message":"stale"}'), { status: 409 });

type Props = Parameters<typeof useAdminReviewMutations>[0];

// 渲染辅助函数
function renderMutations(overrides: Partial<Props> = {}) {
  let list: Workshop[] = [pending, other]; // 模拟页面上的 workshop 列表
  const props: Props = {
    isAuthenticated: true, // 已登录
    getAuthToken: vi.fn().mockResolvedValue('token'), // 假 token
    selectedWorkshop: pending, // 选中了 w1
    selectedHasDetail: true, // 详情已加载
    formData: validForm, // 表单内容
    pendingImageFile: null, // 没有新封面
    setPendingImageFile: vi.fn(),
    clearLocalImagePreview: vi.fn(),
    rejectComment: '', // 驳回理由
    setValidationState: vi.fn(), // 显示字段错误
    clearValidationState: vi.fn(), // 清除字段错误
    // setWorkshops 收到的是"更新函数"(prev => next)。这里真的执行它，更新上面的 list，这样就能检查列表变成了什么样
    setWorkshops: vi.fn((update) => { list = typeof update === 'function' ? update(list) : update; }),
    refreshWorkshops: vi.fn(), // 重新从后端拉列表
    ...overrides,
  };
  const view = renderHook(() => useAdminReviewMutations(props));
  return { ...view, props, getList: () => list }; // getList：拿到当前的列表
}

beforeEach(() => {
  vi.clearAllMocks(); // 清空所有假函数的调用记录
  vi.spyOn(console, 'error').mockImplementation(() => {}); // hook 失败时会 console.error，测试里让它安静
});

describe('useAdminReviewMutations', () => {
  describe('approve', () => {
    it('sends the id, version and token, marks the workshop approved and reloads the list', async () => {
      service.approve.mockResolvedValue(undefined); // 后端：成功
      const { result, props, getList } = renderMutations();

      await act(() => result.current.handleApprove()); // 点"通过"

      expect(service.approve).toHaveBeenCalledWith('w1', 3, 'token'); // ⭐ 带上版本号 3，后端才能发现冲突
      expect(getList().find((w) => w.id === 'w1')?.status).toBe('approved'); // 列表里马上显示"已通过"（不用等刷新）
      expect(getList().find((w) => w.id === 'w2')?.status).toBe('pending'); // 别的 workshop 没被误改
      expect(props.refreshWorkshops).toHaveBeenCalledTimes(1); // 再从后端拉一次，拿到最准确的数据
      expect(toast.success).toHaveBeenCalledWith('Workshop approved.');
      expect(result.current.isSaving).toBe(false); // 结束后"保存中"状态恢复
    });

    it('tells the admin and reloads when another admin changed the workshop first (409)', async () => {
      service.approve.mockRejectedValue(conflict()); // 后端：版本号对不上
      const { result, props, getList } = renderMutations();

      await act(() => result.current.handleApprove());

      expect(toast.error).toHaveBeenCalledWith(
        'Another admin changed this workshop. It has been reloaded with the latest version.'
      ); // 说清楚原因，而不是笼统的"失败"
      expect(props.refreshWorkshops).toHaveBeenCalledTimes(1); // 拉最新版本
      expect(getList()[0].status).toBe('pending'); // ⭐ 本地列表不能假装成功改成 approved
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows a generic error and does not touch the list for other failures', async () => {
      service.approve.mockRejectedValue(new Error('boom')); // 其他错误
      const { result, props, getList } = renderMutations();

      await act(() => result.current.handleApprove());

      expect(toast.error).toHaveBeenCalledWith('Failed to approve workshop.');
      expect(props.setWorkshops).not.toHaveBeenCalled(); // 列表没动
      expect(props.refreshWorkshops).not.toHaveBeenCalled(); // 也没刷新
      expect(getList()[0].status).toBe('pending');
    });

    it('does nothing when the details are not loaded yet', async () => {
      const { result } = renderMutations({ selectedHasDetail: false }); // 详情还没加载完
      await act(() => result.current.handleApprove());
      expect(service.approve).not.toHaveBeenCalled(); // 不会拿着不完整的数据去审核
    });

    it('does not call the backend without a token', async () => {
      const { result } = renderMutations({ getAuthToken: vi.fn().mockResolvedValue(null) });
      await act(() => result.current.handleApprove());
      expect(service.approve).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Failed to approve workshop.'); // 告诉用户失败了，而不是什么都不发生
    });
  });

  describe('reject', () => {
    it('sends the rejection note and stores it on the workshop', async () => {
      service.reject.mockResolvedValue(undefined);
      const { result, getList } = renderMutations({ rejectComment: 'Please add a venue' });

      await act(() => result.current.handleReject()); // 点"驳回"

      expect(service.reject).toHaveBeenCalledWith('w1', 'Please add a venue', 3, 'token'); // 理由传给后端
      expect(getList()[0]).toMatchObject({ status: 'rejected', rejectionNote: 'Please add a venue' }); // 列表里也显示理由
    });

    it('sends undefined (not an empty string) when there is no note', async () => {
      service.reject.mockResolvedValue(undefined);
      const { result, getList } = renderMutations({ rejectComment: '' });

      await act(() => result.current.handleReject());

      expect(service.reject).toHaveBeenCalledWith('w1', undefined, 3, 'token'); // 理由是选填的，空就不传
      expect(getList()[0].rejectionNote).toBe('');
    });

    it('handles a 409 conflict the same way as approve', async () => {
      service.reject.mockRejectedValue(conflict());
      const { result, props, getList } = renderMutations();
      await act(() => result.current.handleReject());
      expect(props.refreshWorkshops).toHaveBeenCalledTimes(1);
      expect(getList()[0].status).toBe('pending'); // 没有假装驳回成功
    });
  });

  describe('cancel', () => {
    it('marks the workshop cancelled', async () => {
      service.cancel.mockResolvedValue(undefined);
      const { result, getList } = renderMutations({ selectedWorkshop: { ...pending, status: 'approved' } });
      await act(() => result.current.handleCancel()); // 点"取消 workshop"
      expect(service.cancel).toHaveBeenCalledWith('w1', 3, 'token');
      expect(getList()[0].status).toBe('cancelled');
    });
  });

  describe('save edited fields', () => {
    it('blocks an invalid form before calling the backend and shows the field errors', async () => {
      const { result, props } = renderMutations({ formData: { ...validForm, title: ' ', duration: '0' } }); // 标题空、时长 0

      await act(() => result.current.handleSave()); // 点"保存"

      expect(service.update).not.toHaveBeenCalled(); // ⭐ 没有发请求
      expect(props.setValidationState).toHaveBeenCalledWith(
        { title: 'Workshop name/skill taught is required.', duration: 'Duration must be a positive integer in minutes.' },
        'Workshop name/skill taught is required.' // 总错误 = 第一个出错的字段
      );
      expect(toast.error).toHaveBeenCalledWith('Workshop name/skill taught is required.');
    });

    it('converts the form into the API payload', async () => {
      service.update.mockResolvedValue({ ...pending, title: 'Pottery 2' });
      const { result } = renderMutations();

      await act(() => result.current.handleSave());

      // expect.objectContaining：只检查列出的字段，其他字段不管
      expect(service.update).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({
          contactNumber: '0412345678', // 去掉了空格
          duration: 90, // 字符串 → 数字
          maxParticipants: 12,
          weekNumber: 4,
          attendCloseAt: '2098-12-31T18:00:00', // datetime-local 没有秒，补上 ":00"
          location: 'Room 2', // 线下 → 用填的地点
          version: 3, // ⭐ 带版本号
        }),
        'token'
      );
    });

    it('sends "Online" as the location and null for empty optional numbers', async () => {
      service.update.mockResolvedValue(pending);
      const { result } = renderMutations({ formData: { ...validForm, isOnline: true, maxParticipants: '', weekNumber: '' } });
      await act(() => result.current.handleSave());
      expect(service.update).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({ location: 'Online', maxParticipants: null, weekNumber: null }), // 空 → null（不限）
        'token'
      );
    });

    it('replaces the workshop in the list with what the backend returned', async () => {
      service.update.mockResolvedValue({ ...pending, title: 'From server', version: 4 }); // 后端返回的新版本
      const { result, getList } = renderMutations();
      await act(() => result.current.handleSave());
      expect(getList()[0]).toMatchObject({ title: 'From server', version: 4 }); // 用后端的数据（包括新版本号），不是表单里的
      expect(toast.success).toHaveBeenCalledWith('Workshop updated successfully.');
    });

    it('uploads a new cover after saving the fields and clears the pending file', async () => {
      const file = new File(['x'], 'cover.png', { type: 'image/png' }); // 一个假的图片文件
      service.update.mockResolvedValue({ ...pending, version: 4 });
      service.uploadImage.mockResolvedValue({ ...pending, version: 5, image: 'https://cdn/cover.png' });
      const { result, props, getList } = renderMutations({ pendingImageFile: file });

      await act(() => result.current.handleSave());

      expect(service.uploadImage).toHaveBeenCalledWith('w1', file, 'token'); // 先改字段、再传图
      expect(getList()[0]).toMatchObject({ version: 5, image: 'https://cdn/cover.png' }); // 用最后一次返回的数据
      expect(props.setPendingImageFile).toHaveBeenCalledWith(null); // 清掉待上传的文件
      expect(props.clearLocalImagePreview).toHaveBeenCalled(); // 清掉本地预览
    });

    it('keeps the admin\'s edits on a 409 conflict instead of reloading over them', async () => {
      service.update.mockRejectedValue(conflict());
      const { result, props, getList } = renderMutations();

      await act(() => result.current.handleSave());

      expect(toast.error).toHaveBeenCalledWith(
        'Another admin changed this workshop after you opened it, so your edits were not saved. Copy them, then reload the page.'
      );
      expect(props.refreshWorkshops).not.toHaveBeenCalled(); // ⭐ 和通过/驳回不一样：这里不自动刷新，否则表单里没保存的内容会被冲掉
      expect(getList()[0].title).toBe('Pottery'); // 列表没变
      expect(result.current.isSaving).toBe(false);
    });

    it('shows the backend message for other save errors', async () => {
      service.update.mockRejectedValue(new Error('{"message":"Venue is closed that day"}')); // 后端返回 JSON 错误
      const { result } = renderMutations();
      await act(() => result.current.handleSave());
      expect(toast.error).toHaveBeenCalledWith('Venue is closed that day'); // 从 JSON 里取出文字给用户看
    });

    // bug B（已修）：以前校验用 Number()，保存用 parseInt()，两边对 "1e2" 的理解不一样
    //    Number("1e2") = 100 → 校验通过；parseInt("1e2") = 1 → 实际存了 1 分钟
    //    修法：校验和保存都调用同一个 parseFormNumber，和创建表单一样把 "1e2" 当成 100
    it('saves the same duration the validation accepted, e.g. "1e2" (bug B)', async () => {
      service.update.mockResolvedValue(pending);
      const { result } = renderMutations({ formData: { ...validForm, duration: '1e2' } }); // type="number" 的输入框允许输入 e
      await act(() => result.current.handleSave());
      expect(service.update).toHaveBeenCalledWith('w1', expect.objectContaining({ duration: 100 }), 'token'); // 存的是 100，修之前是 1
    });

    it('saves the same max participants the validation accepted, e.g. "2e1"', async () => {
      service.update.mockResolvedValue(pending); // 后端保存成功
      const { result } = renderMutations({ formData: { ...validForm, maxParticipants: '2e1' } }); // 人数输入框里输入 2e1（= 20）
      await act(() => result.current.handleSave()); // 点保存
      expect(service.update).toHaveBeenCalledWith('w1', expect.objectContaining({ maxParticipants: 20 }), 'token'); // 存 20 人。防的 bug：parseInt 读成 2，名额被悄悄改小
    });

    it('saves the same week number the validation accepted, e.g. "1e1"', async () => {
      service.update.mockResolvedValue(pending); // 后端保存成功
      const { result } = renderMutations({ formData: { ...validForm, weekNumber: '1e1' } }); // 周数输入框里输入 1e1（= 10）
      await act(() => result.current.handleSave()); // 点保存
      expect(service.update).toHaveBeenCalledWith('w1', expect.objectContaining({ weekNumber: 10 }), 'token'); // 存第 10 周。防的 bug：parseInt 读成 1，排到第 1 周
    });
  });
});
