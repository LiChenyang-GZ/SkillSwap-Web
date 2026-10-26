// 单元测试 3（纯逻辑）：admin 审核页面编辑 workshop 时的表单校验
// 测什么：admin 改完字段点保存之前，哪些值会被拦下、错误文字是什么
// 属于哪一层：单元测试。纯函数，不 mock
// 和创建表单（createWorkshopValidation）的区别：规则很像，但 admin 多了 Week #，而且不要求勾"信息无误"——这两个区别正是测试要锁住的
import { describe, it, expect } from 'vitest'; // 测试框架
import { validateAdminReviewWorkshopForm } from './adminReviewValidation'; // 被测函数
import { emptyWorkshopForm, type WorkshopFormState } from '../models/adminReviewFormModel'; // 空表单和类型

// 测试数据工厂：一份全部合法的 admin 表单
function makeForm(overrides: Partial<WorkshopFormState> = {}): WorkshopFormState {
  return {
    ...emptyWorkshopForm, // 选填项都是空
    hostName: 'Alice', // 主持人
    title: 'Intro to Pottery', // 标题
    category: 'Creative', // 类别
    contactNumber: '0412 345 678', // 带空格的澳洲号码
    date: '2026-11-01', // 日期
    time: '10:00', // 时间
    duration: '60', // 时长
    ...overrides, // 覆盖
  };
}

describe('validateAdminReviewWorkshopForm', () => {
  it('accepts a valid form and returns no errors', () => {
    expect(validateAdminReviewWorkshopForm(makeForm())).toEqual({ isValid: true, fieldErrors: {}, formError: null });
  });

  it('does not require the "details confirmed" checkbox (unlike the create form)', () => {
    // 区别 1：admin 编辑时，这个勾选框是用户当初填的信息，admin 不需要再勾一次
    expect(validateAdminReviewWorkshopForm(makeForm({ detailsConfirmed: false })).isValid).toBe(true);
  });

  // 必填字段：[字段, 期望文字]。注意 date/time 的文字和创建表单不一样（没有 "Confirmed"）
  describe.each([
    ['hostName', 'Host name is required.'],
    ['title', 'Workshop name/skill taught is required.'],
    ['category', 'Category is required.'],
    ['contactNumber', 'Contact number is required.'],
    ['date', 'Workshop date is required.'],
    ['time', 'Workshop time is required.'],
    ['duration', 'Duration is required.'],
  ] as const)('required field %s', (field, message) => {
    it('rejects an empty value with its own message and no other field errors', () => {
      const result = validateAdminReviewWorkshopForm(makeForm({ [field]: '' })); // 只清空这一个
      expect(result.isValid).toBe(false); // 不通过
      expect(result.fieldErrors).toEqual({ [field]: message }); // 只有这一个字段报错，并且是"必填"那条（不是格式那条）
      expect(result.formError).toBe(message); // 总错误 = 这个字段的错误
    });

    it('rejects a value that is only spaces', () => {
      expect(validateAdminReviewWorkshopForm(makeForm({ [field]: '  \t ' })).fieldErrors[field]).toBe(message); // 空格和 Tab
    });
  });

  it.each(['0412-345-678', '(02) 9351 2222'])('accepts the phone format "%s"', (contactNumber) => {
    expect(validateAdminReviewWorkshopForm(makeForm({ contactNumber })).isValid).toBe(true); // 横线、括号会被去掉
  });

  it.each(['041234567', '+61 412 345 678', '1234567890'])('rejects the phone number "%s"', (contactNumber) => {
    // 9 位、+61 开头、不是 0 开头
    expect(validateAdminReviewWorkshopForm(makeForm({ contactNumber })).fieldErrors.contactNumber).toBe(
      'Please enter a valid Australian 10-digit number.'
    );
  });

  it.each(['0', '-15', '45.5', 'abc'])('rejects the duration "%s"', (duration) => {
    expect(validateAdminReviewWorkshopForm(makeForm({ duration })).fieldErrors.duration).toBe(
      'Duration must be a positive integer in minutes.'
    );
  });

  describe('optional whole-number fields', () => {
    // 区别 2：admin 表单多了 Week #（第几周），选填，但填了就必须是正整数。[字段, 错误文字]
    describe.each([
      ['maxParticipants', 'Max participants must be a positive integer.'],
      ['weekNumber', 'Week # must be a positive integer.'],
    ] as const)('%s', (field, message) => {
      it('accepts an empty value', () => {
        expect(validateAdminReviewWorkshopForm(makeForm({ [field]: '' })).isValid).toBe(true); // 不填可以
      });

      it('accepts a positive whole number', () => {
        expect(validateAdminReviewWorkshopForm(makeForm({ [field]: '3' })).isValid).toBe(true); // 正整数可以
      });

      it.each(['0', '-2', '1.5'])('rejects "%s"', (value) => {
        expect(validateAdminReviewWorkshopForm(makeForm({ [field]: value })).fieldErrors[field]).toBe(message); // 0、负数、小数不行
      });
    });
  });

  it('uses the error of the first invalid field in form order as the form error', () => {
    // 后面的 Week # 和前面的类别同时出错 → 总错误取类别的
    const result = validateAdminReviewWorkshopForm(makeForm({ weekNumber: '0', category: '' }));
    expect(Object.keys(result.fieldErrors).sort()).toEqual(['category', 'weekNumber']); // 两个都报了
    expect(result.formError).toBe('Category is required.'); // 总错误是靠前的那个
  });

  it('falls back to the generic message when only an unlisted field is invalid', () => {
    // eventSubmitted 只能是 'true' / 'false'。塞一个别的值（模拟脏数据），它不在"顺序列表"里
    const result = validateAdminReviewWorkshopForm(
      makeForm({ eventSubmitted: 'maybe' as WorkshopFormState['eventSubmitted'] })
    );
    expect(result.isValid).toBe(false); // 照样拦下
    expect(Object.keys(result.fieldErrors)).toEqual(['eventSubmitted']); // 错误挂在这个字段上
    expect(result.formError).toBe('Please review the highlighted fields before saving.'); // 总错误用兜底文字，不是 undefined
  });
});
