// Hook 测试 3（带状态的流程）：个人中心的"编辑资料"弹窗
// 测什么：加技能时的提示（空的、重复的、太长的、超过数量上限）；保存时只发"改了的字段"；名字为空、学校没选、头像格式不对时拦下来
// 属于哪一层：hook 测试（renderHook）。假的：保存资料、上传头像这两个接口（作为参数传进来，直接给 vi.fn()）和 toast 弹窗
import { describe, it, expect, vi, beforeEach } from 'vitest'; // 测试框架
import { renderHook, act } from '@testing-library/react'; // 运行 hook、等状态更新
import type { ChangeEvent, FormEvent } from 'react'; // 事件类型
import { useDashboardProfileForm } from './useDashboardProfileForm'; // 被测 hook
import { toast } from 'sonner'; // 下面换成假的
import type { User } from '../../../types/user'; // 类型

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } })); // 成功 / 失败弹窗

// 当前用户：已经有两个技能，学校是下拉框里有的
const alice: User = {
  id: 'u1', username: 'alice', email: 'a@x.com', bio: 'Hi', university: 'University of Sydney',
  skills: ['Python', 'Pottery'], totalWorkshopsHosted: 0, totalWorkshopsAttended: 0, rating: 0, createdAt: '2026-01-01',
};

// 渲染辅助函数：打开弹窗，返回 hook 的结果和两个假接口
function renderProfileForm(user: User | null = alice) {
  const updateCurrentUserProfile = vi.fn().mockResolvedValue(user); // 保存资料：默认成功
  const uploadCurrentUserAvatar = vi.fn().mockResolvedValue(user); // 上传头像：默认成功
  const view = renderHook(() => useDashboardProfileForm({ user, updateCurrentUserProfile, uploadCurrentUserAvatar }));
  act(() => view.result.current.openEditProfileDialog()); // 打开弹窗：会把用户现在的资料复制到"草稿"里
  return { ...view, updateCurrentUserProfile, uploadCurrentUserAvatar };
}

// 在技能输入框里打字，然后点"添加"
function addSkill(result: { current: ReturnType<typeof useDashboardProfileForm> }, text: string) {
  act(() => result.current.handleSkillDraftChange(text)); // 打字
  act(() => { result.current.addSkillFromDraft(); }); // 点添加（单独一个 act：要等上一步的状态更新完，才能读到最新的草稿）
}

// 提交表单：handleSaveProfile 需要一个表单事件，这里给一个只有 preventDefault 的假事件
const submit = (result: { current: ReturnType<typeof useDashboardProfileForm> }) =>
  act(() => result.current.handleSaveProfile({ preventDefault: () => {} } as FormEvent<HTMLFormElement>));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDashboardProfileForm', () => {
  it('copies the current profile into the form when the dialog opens', () => {
    const { result } = renderProfileForm();
    expect(result.current).toMatchObject({
      isEditProfileOpen: true, // 弹窗打开了
      editUsername: 'alice',
      editBio: 'Hi',
      editSkills: ['Python', 'Pottery'],
      editUniversitySelection: 'University of Sydney', // 下拉框里有 → 直接选中
      editUniversityCustom: '',
    });
  });

  describe('adding a skill', () => {
    it('adds a trimmed skill and clears the input', () => {
      const { result } = renderProfileForm();
      addSkill(result, '  Knitting  '); // 前后有空格
      expect(result.current.editSkills).toEqual(['Python', 'Pottery', 'Knitting']); // 去掉了空格
      expect(result.current.skillDraft).toBe(''); // 输入框清空，方便输入下一个
      expect(result.current.skillError).toBeNull();
    });

    it.each(['', '   '])('asks the user to type something for an empty skill "%s"', (text) => {
      const { result } = renderProfileForm();
      addSkill(result, text);
      expect(result.current.skillError).toBe('Type a skill before adding it.'); // 空的 / 只有空格
      expect(result.current.editSkills).toHaveLength(2); // 没有加进去
    });

    it('rejects a duplicate regardless of letter case', () => {
      const { result } = renderProfileForm();
      addSkill(result, 'PYTHON'); // 已经有 Python 了，只是大小写不同
      expect(result.current.skillError).toBe('You have already added that skill.');
      expect(result.current.editSkills).toEqual(['Python', 'Pottery']);
    });

    it('accepts exactly 100 characters but rejects 101', () => {
      // 边界值：后端这一列最多 100 个字符。防的 bug：前端放过了，后端存的时候报错或者被截断
      const { result } = renderProfileForm();
      addSkill(result, 'a'.repeat(101)); // 101 个字符
      expect(result.current.skillError).toBe('Skills can be at most 100 characters.');
      addSkill(result, 'b'.repeat(100)); // 刚好 100 个
      expect(result.current.skillError).toBeNull();
      expect(result.current.editSkills).toContain('b'.repeat(100));
    });

    it('checks the length after trimming spaces', () => {
      const { result } = renderProfileForm();
      addSkill(result, ` ${'c'.repeat(100)} `); // 加上空格是 102 个，去掉空格是 100 个
      expect(result.current.skillError).toBeNull(); // 按去掉空格后的长度算
    });

    it('stops at 50 skills', () => {
      const fifty = Array.from({ length: 50 }, (_, i) => `Skill ${i}`); // 已经有 50 个
      const { result } = renderProfileForm({ ...alice, skills: fifty });
      addSkill(result, 'One more');
      expect(result.current.skillError).toBe('You can list up to 50 skills.');
      expect(result.current.editSkills).toHaveLength(50);
    });

    it('clears the skill error as soon as the user types again', () => {
      const { result } = renderProfileForm();
      addSkill(result, 'python'); // 重复 → 有错误
      act(() => result.current.handleSkillDraftChange('pythons')); // 接着打字
      expect(result.current.skillError).toBeNull(); // 错误马上消失，不会一直挂着
    });

    it('removes a skill', () => {
      const { result } = renderProfileForm();
      act(() => result.current.removeSkill('Python'));
      expect(result.current.editSkills).toEqual(['Pottery']);
    });
  });

  describe('saving', () => {
    it('sends only the fields that changed', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.setEditBio('  New bio  ')); // 只改了简介

      await submit(result);

      // ⭐ 只发 bio。防的 bug：把整份资料都发回去，可能覆盖掉别的地方刚改的字段
      expect(updateCurrentUserProfile).toHaveBeenCalledWith({ bio: 'New bio' });
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully.');
      expect(result.current.isEditProfileOpen).toBe(false); // 关掉弹窗
    });

    it('closes without calling the backend when nothing changed', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      await submit(result); // 什么都没改就点保存
      expect(updateCurrentUserProfile).not.toHaveBeenCalled(); // 不发请求
      expect(result.current.isEditProfileOpen).toBe(false);
    });

    it('rejects an empty name', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.setEditUsername('   ')); // 名字只有空格
      await submit(result);
      expect(result.current.profileError).toBe('Name cannot be empty.');
      expect(updateCurrentUserProfile).not.toHaveBeenCalled();
      expect(result.current.isEditProfileOpen).toBe(true); // 弹窗不关，让用户改
    });

    it('adds a skill that was typed but not yet added, instead of losing it', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.handleSkillDraftChange('Knitting')); // 打了字，但忘了点"添加"

      await submit(result); // 直接点保存

      expect(updateCurrentUserProfile).toHaveBeenCalledWith({ skills: ['Python', 'Pottery', 'Knitting'] }); // 自动加上了
    });

    it('keeps the dialog open when the typed-but-not-added skill is a duplicate', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.handleSkillDraftChange('pottery')); // 没点添加，而且是重复的

      await submit(result);

      expect(result.current.skillError).toBe('You have already added that skill.'); // 告诉用户为什么没保存
      expect(updateCurrentUserProfile).not.toHaveBeenCalled();
      expect(result.current.isEditProfileOpen).toBe(true);
    });

    it('cuts the bio to 255 characters', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.setEditBio('x'.repeat(300)));
      await submit(result);
      expect(updateCurrentUserProfile.mock.calls[0][0].bio).toHaveLength(255); // mock.calls[0][0]：第一次调用的第一个参数
    });

    it('requires a university name when "Other" is chosen', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      act(() => result.current.handleEditUniversitySelectionChange('__OTHER__')); // 选了"其他学校"
      act(() => result.current.handleEditUniversityCustomChange(' A ')); // 只填了一个字母
      await submit(result);
      expect(result.current.profileError).toBe('Please enter your university name.'); // 至少 2 个字符
      expect(updateCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('requires a university to be selected', async () => {
      const { result } = renderProfileForm({ ...alice, university: undefined }); // 老用户还没填学校
      await submit(result);
      expect(result.current.profileError).toBe('Please select your university.');
    });

    it('shows the error and keeps the dialog open when saving fails', async () => {
      const { result, updateCurrentUserProfile } = renderProfileForm();
      updateCurrentUserProfile.mockRejectedValue(new Error('Username already taken')); // 后端：名字被占用
      act(() => result.current.setEditUsername('bob'));

      await submit(result);

      expect(result.current.profileError).toBe('Username already taken'); // 弹窗里显示原因
      expect(toast.error).toHaveBeenCalledWith('Username already taken');
      expect(result.current.isEditProfileOpen).toBe(true); // 不关，用户改的内容还在
      expect(result.current.editUsername).toBe('bob');
      expect(result.current.isSavingProfile).toBe(false); // "保存中"状态恢复
    });
  });

  describe('avatar file', () => {
    // 模拟用户在文件选择框里选了一个文件
    const pick = (result: { current: ReturnType<typeof useDashboardProfileForm> }, file: File) =>
      act(() =>
        result.current.handleAvatarFileChange({
          target: { files: [file] }, // 选中的文件
          currentTarget: { value: 'C:\\fakepath\\file' }, // 代码会把它清空，这样同一个文件可以再选一次
        } as unknown as ChangeEvent<HTMLInputElement>)
      );

    it('rejects an unsupported file type', () => {
      const { result } = renderProfileForm();
      pick(result, new File(['x'], 'avatar.svg', { type: 'image/svg+xml' })); // SVG 里可以藏脚本，不允许
      expect(result.current.profileError).toBe('Unsupported image format. Please use PNG/JPG/WEBP/GIF.');
      expect(result.current.pendingAvatarFile).toBeNull(); // 没有收下这个文件
    });

    it('rejects a file over the size limit', () => {
      const { result } = renderProfileForm();
      const big = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(big, 'size', { value: 50 * 1024 * 1024 }); // 不真的造 50MB 的数据，只把 size 改成 50MB
      pick(result, big);
      expect(result.current.profileError).toMatch(/^Image size must be \d+ MB or smaller\.$/); // 上限来自环境变量，所以只检查格式
      expect(result.current.pendingAvatarFile).toBeNull();
    });

    it('accepts a PNG and uploads it on save even if no text changed', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:preview'); // jsdom 没有这个函数（生成本地预览地址），补一个假的
      URL.revokeObjectURL = vi.fn(); // 同上（释放预览地址）
      const { result, updateCurrentUserProfile, uploadCurrentUserAvatar } = renderProfileForm();
      const png = new File(['x'], 'me.png', { type: 'image/png' });
      pick(result, png);
      expect(result.current.pendingAvatarPreviewUrl).toBe('blob:preview'); // 显示预览

      await submit(result);

      expect(updateCurrentUserProfile).not.toHaveBeenCalled(); // 文字没改，不调资料接口
      expect(uploadCurrentUserAvatar).toHaveBeenCalledWith(png); // 只上传头像
    });
  });
});
