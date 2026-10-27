// 组件测试（带状态的界面）：admin 审核页右边的详情面板
// 测什么：同一个面板，workshop 处在不同状态时，"保存 / 取消 / 驳回 / 通过"四个按钮哪些能点；错误提示显示在哪；点了按钮调哪个回调
// 属于哪一层：组件测试（Vitest + React Testing Library）。所有数据和回调都用 props 传进去，不碰后端
// 和 useAdminReviewMutations.test.ts 的分工：那边测"点了以后发生什么"（调后端、更新列表），这边测"什么时候能点、点了交给谁"
import { describe, it, expect, vi } from 'vitest'; // 测试框架
import { createRef } from 'react'; // 组件要一个 ref（指向隐藏的文件选择框）
import { render, screen } from '@testing-library/react'; // 渲染、找元素
import userEvent from '@testing-library/user-event'; // 模拟用户点击、打字
import { AdminReviewDetailPanel } from './AdminReviewDetailPanel'; // 被测组件
import { emptyWorkshopForm } from '../models/adminReviewFormModel'; // 空表单
import type { Workshop } from '../../../types/workshop'; // 类型

// 测试数据工厂：一个还没开始（2099 年）的待审核 workshop
// 用很远的未来 / 很远的过去当日期，就不需要假时钟：今天跑、明年跑结果都一样
function makeWorkshop(overrides: Partial<Workshop> = {}): Workshop {
  return {
    id: 'w1', title: 'Pottery', description: '', category: 'Creative', status: 'pending',
    date: '2099-01-01', time: '10:00', duration: 60, isOnline: false, location: 'Room 1',
    creditCost: 0, creditReward: 0, facilitator: null,
    ...overrides,
  };
}

type Props = Parameters<typeof AdminReviewDetailPanel>[0]; // 组件 props 的类型

// 渲染辅助函数：默认"详情已加载、表单有修改、没在保存"，测试只覆盖需要的
function renderPanel(overrides: Partial<Props> = {}) {
  const props: Props = {
    isLoading: false,
    isDetailLoading: false,
    isSaving: false, // 没在保存
    selectedWorkshop: makeWorkshop(),
    selectedHasDetail: true, // 详情已加载
    selectedDetailError: null,
    formData: { ...emptyWorkshopForm, title: 'Pottery' },
    formError: null, // 没有总错误
    rejectComment: '',
    localImagePreviewUrl: null,
    imageFileInputRef: createRef<HTMLInputElement>(),
    isDirty: true, // 表单有改动
    onRetryLoadDetails: vi.fn(),
    onInputChange: vi.fn(),
    getFieldError: () => null, // 默认没有字段错误
    onRejectCommentChange: vi.fn(),
    onImageFileSelection: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onReject: vi.fn(),
    onApprove: vi.fn(),
    onExportParticipantsCsv: vi.fn(),
    ...overrides,
  };
  render(<AdminReviewDetailPanel {...props} />);
  return props;
}

// 找到四个操作按钮。name 用正则 /^Reject$/：只匹配文字刚好是 "Reject" 的按钮
const buttons = () => ({
  save: screen.getByRole('button', { name: 'Save Changes' }),
  cancel: screen.getByRole('button', { name: 'Cancel Workshop' }),
  reject: screen.getByRole('button', { name: /^Reject$/ }),
  approve: screen.getByRole('button', { name: /^Approve$/ }),
});

describe('AdminReviewDetailPanel', () => {
  describe('which actions are allowed', () => {
    it('lets the admin save, reject or approve a pending workshop, but not cancel it', () => {
      renderPanel(); // 待审核、还没开始
      const b = buttons();
      expect(b.save).toBeEnabled(); // toBeEnabled：按钮可以点
      expect(b.reject).toBeEnabled();
      expect(b.approve).toBeEnabled();
      expect(b.cancel).toBeDisabled(); // 还没通过，谈不上"取消"
    });

    it('only allows cancel and save for an approved workshop', () => {
      renderPanel({ selectedWorkshop: makeWorkshop({ status: 'approved' }) });
      const b = buttons();
      expect(b.cancel).toBeEnabled(); // 已通过 → 可以取消
      expect(b.save).toBeEnabled(); // 还可以改字段
      expect(b.approve).toBeDisabled(); // 不能再通过一次
      expect(b.reject).toBeDisabled(); // 通过以后不能驳回
    });

    it('locks every action once the workshop has started', () => {
      // 开始时间已经过了：不能再审核、不能改、不能取消
      renderPanel({ selectedWorkshop: makeWorkshop({ date: '2000-01-01' }) });
      Object.values(buttons()).forEach((button) => expect(button).toBeDisabled()); // 四个按钮全是灰的
    });

    it.each(['cancelled', 'completed'] as const)('does not allow editing a %s workshop', (status) => {
      renderPanel({ selectedWorkshop: makeWorkshop({ status }) });
      expect(buttons().save).toBeDisabled(); // 已取消 / 已结束 → 不能改
      expect(screen.getByLabelText(/Host Name/)).toBeDisabled(); // 输入框也是灰的。getByLabelText：通过 <label> 文字找输入框
    });

    it('disables Save when nothing has changed', () => {
      renderPanel({ isDirty: false }); // 表单没改动
      expect(buttons().save).toBeDisabled(); // 防的问题：没改也能点保存，白白多一次请求，还可能因为版本号报冲突
    });

    it('disables every action while a request is in progress', () => {
      renderPanel({ isSaving: true }); // 正在保存
      Object.values(buttons()).forEach((button) => expect(button).toBeDisabled()); // 防止连点两次"通过"
    });
  });

  describe('clicks go to the right handler', () => {
    it('calls onApprove, and nothing else, when Approve is clicked', async () => {
      const user = userEvent.setup();
      const props = renderPanel();
      await user.click(buttons().approve);
      expect(props.onApprove).toHaveBeenCalledTimes(1);
      expect(props.onReject).not.toHaveBeenCalled(); // 没有误触发驳回
    });

    it('passes the typed rejection note up, then calls onReject', async () => {
      const user = userEvent.setup();
      const props = renderPanel();
      await user.type(screen.getByLabelText('Rejection Note (optional)'), 'No'); // 打字：一个字母一个字母地输入
      expect(props.onRejectCommentChange).toHaveBeenLastCalledWith('o'); // 受控组件：每次只上报当前这一次输入（value 由父组件管）
      await user.click(buttons().reject);
      expect(props.onReject).toHaveBeenCalledTimes(1);
    });

    it('calls onInputChange with the field name when a field is edited', async () => {
      const user = userEvent.setup();
      const props = renderPanel();
      await user.type(screen.getByLabelText(/Host Name/), 'A');
      expect(props.onInputChange).toHaveBeenCalledWith('hostName', 'A'); // 告诉父组件"哪个字段、新值是什么"
    });
  });

  describe('errors', () => {
    it('shows the form error at the top and the field error under its field', () => {
      renderPanel({
        formError: 'Please review the highlighted fields before saving.', // 总错误
        getFieldError: (field) => (field === 'duration' ? 'Duration is required.' : null), // 只有时长有错
      });
      expect(screen.getByText('Please review the highlighted fields before saving.')).toBeInTheDocument();
      expect(screen.getByText('Duration is required.')).toBeInTheDocument(); // 字段错误显示出来
    });

    it('shows a retry button when the details failed to load', async () => {
      const user = userEvent.setup();
      const props = renderPanel({ selectedHasDetail: false, selectedDetailError: 'Could not load details.' });
      expect(screen.getByText('Could not load details.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument(); // ⭐ 详情没加载完，不能审核
      await user.click(screen.getByRole('button', { name: 'Retry loading details' }));
      expect(props.onRetryLoadDetails).toHaveBeenCalledTimes(1);
    });
  });

  it('hides the rejection note box for an approved workshop', () => {
    renderPanel({ selectedWorkshop: makeWorkshop({ status: 'approved' }) });
    expect(screen.queryByLabelText('Rejection Note (optional)')).not.toBeInTheDocument();
  });
});
