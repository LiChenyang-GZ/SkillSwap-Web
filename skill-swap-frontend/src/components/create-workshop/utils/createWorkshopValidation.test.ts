// 单元测试 2（纯逻辑）：创建 workshop 表单的校验规则
// 测什么：用户填的表单值 → 哪些字段有错、错误文字是什么、页面应该先跳到哪个字段；还有"提交按钮能不能点"的判断
// 属于哪一层：单元测试。被测的是纯函数（里面用 zod 做校验），不渲染表单、不 mock 任何东西
// 为什么要测：这些规则决定了用户能不能把 workshop 交上去。规则写错了，要么正常用户交不上，要么脏数据进了后端
import { describe, it, expect } from 'vitest'; // 测试框架
import {
  isCreateWorkshopFormSubmittable, // 被测函数 1：必填项是不是都填了（决定提交按钮能不能点）
  normalizeAustralianContactNumber, // 被测函数 2：电话号码只留数字
  validateCreateWorkshopValues, // 被测函数 3：完整校验，返回每个字段的错误
} from './createWorkshopValidation';
import {
  defaultCreateWorkshopFormValues, // 表单的初始值（全空）
  type CreateWorkshopFormValues, // 表单值的类型
} from '../models/createWorkshopFormModel';
import { CREATE_WORKSHOP_VALIDATION_ERROR_MESSAGE } from '../constants/createWorkshopStatusConstants'; // 兜底的总错误文字

// 测试数据工厂：一份"全部填对"的表单，每个测试只改自己关心的字段
function makeValues(overrides: Partial<CreateWorkshopFormValues> = {}): CreateWorkshopFormValues {
  return {
    ...defaultCreateWorkshopFormValues, // 先拿初始值（选填项都是空字符串）
    hostName: 'Alice', // 主持人
    title: 'Intro to Pottery', // 标题
    category: 'Creative', // 类别
    contactNumber: '0412345678', // 澳洲手机号：0 开头 + 9 位
    date: '2026-11-01', // 日期
    time: '10:00', // 时间
    duration: '60', // 时长（表单里是字符串）
    maxParticipants: '', // 人数上限：选填，空表示不限
    detailsConfirmed: true, // 勾选了"信息无误"
    ...overrides, // 覆盖
  };
}

describe('validateCreateWorkshopValues', () => {
  it('accepts a fully filled form and returns no errors', () => {
    expect(validateCreateWorkshopValues(makeValues())).toEqual({
      // toEqual：逐个字段比较整个对象（toBe 只比较是不是同一个对象）
      isValid: true, // 通过
      fieldErrors: {}, // 没有任何字段错误
      formError: null, // 没有总错误
      firstInvalidField: null, // 不需要跳到哪个字段
    });
  });

  // 必填的文字字段：空字符串和"只有空格"都要报错。每一行：[字段名, 期望的错误文字]
  describe.each([
    ['hostName', 'Host name is required.'],
    ['title', 'Workshop name/skill taught is required.'],
    ['category', 'Category is required.'],
    ['date', 'Confirmed workshop date is required.'],
    ['time', 'Confirmed workshop time is required.'],
  ] as const)('required field %s', (field, message) => {
    it('rejects an empty value with its own message', () => {
      const result = validateCreateWorkshopValues(makeValues({ [field]: '' })); // 只把这一个字段清空
      expect(result.isValid).toBe(false); // 不通过
      expect(result.fieldErrors).toEqual({ [field]: message }); // ⭐ 只有这一个字段有错，而且文字准确（别的字段没被误报）
      expect(result.firstInvalidField).toBe(field); // 页面会跳到这个字段
      expect(result.formError).toBe(message); // 总错误就是这个字段的错误
    });

    it('rejects a value that is only spaces', () => {
      // 防的 bug：只检查 value.length > 0，用户敲几个空格就能绕过
      const result = validateCreateWorkshopValues(makeValues({ [field]: '   ' }));
      expect(result.fieldErrors[field]).toBe(message);
    });
  });

  describe('contactNumber (Australian 10-digit number)', () => {
    // 这几种写法去掉非数字后都是 0 开头的 10 位数字，应该通过
    it.each(['0412345678', '0412 345 678', '0412-345-678', '(02) 9351 2222', ' 0412345678 '])(
      'accepts "%s"',
      (contactNumber) => {
        expect(validateCreateWorkshopValues(makeValues({ contactNumber })).isValid).toBe(true);
      }
    );

    // 这几种都不是"0 开头的 10 位数字"
    it.each([
      ['9 digits', '041234567'],
      ['11 digits', '04123456789'],
      ['no leading 0', '4123456789'],
      ['+61 international format', '+61 412 345 678'], // 去掉 + 和空格后是 61412345678（11 位，不是 0 开头）→ 不通过（见 PR 说明）
    ])('rejects a number with %s', (_label, contactNumber) => {
      const result = validateCreateWorkshopValues(makeValues({ contactNumber }));
      expect(result.fieldErrors.contactNumber).toBe('Please enter a valid Australian 10-digit number.');
    });

    it('reports "required" (not "invalid") for an empty number, keeping only the first error of the field', () => {
      // 空字符串同时违反两条规则：必填、10 位数字。zod 会把两条错误都返回
      // 代码只保留每个字段的第一条，所以用户看到的是"必填"，而不是莫名其妙的"格式不对"
      const result = validateCreateWorkshopValues(makeValues({ contactNumber: '' }));
      expect(result.fieldErrors.contactNumber).toBe('Contact number is required.');
    });
  });

  describe('duration (positive whole minutes)', () => {
    it('reports "required" for an empty duration, not the integer message', () => {
      // 同样是"一个字段两条错误只留第一条"
      expect(validateCreateWorkshopValues(makeValues({ duration: '' })).fieldErrors.duration).toBe('Duration is required.');
    });

    // 0、负数、小数、不是数字 → 都不是正整数
    it.each(['0', '-30', '1.5', 'abc'])('rejects "%s"', (duration) => {
      expect(validateCreateWorkshopValues(makeValues({ duration })).fieldErrors.duration).toBe(
        'Duration must be a positive integer in minutes.'
      );
    });

    it('accepts a number with spaces around it', () => {
      // Number(" 90 ") 是 90：JS 转数字时会忽略前后空格
      expect(validateCreateWorkshopValues(makeValues({ duration: ' 90 ' })).isValid).toBe(true);
    });
  });

  describe('maxParticipants (optional positive integer)', () => {
    it.each(['', '   ', '20'])('accepts "%s" (empty means no limit)', (maxParticipants) => {
      expect(validateCreateWorkshopValues(makeValues({ maxParticipants })).isValid).toBe(true); // 空 = 不限人数
    });

    it.each(['0', '-1', '2.5', 'ten'])('rejects "%s"', (maxParticipants) => {
      expect(validateCreateWorkshopValues(makeValues({ maxParticipants })).fieldErrors.maxParticipants).toBe(
        'Maximum participants must be a positive integer.'
      );
    });
  });

  it('requires the "details are accurate" checkbox to be ticked', () => {
    const result = validateCreateWorkshopValues(makeValues({ detailsConfirmed: false })); // 没勾
    expect(result.fieldErrors).toEqual({
      detailsConfirmed: 'Please confirm that the details are accurate before submitting.',
    });
  });

  it('points the user to the first invalid field in form order, not in the order errors were found', () => {
    // 故意让后面的字段（时长）和前面的字段（标题）同时出错
    const result = validateCreateWorkshopValues(makeValues({ duration: '0', title: '' }));
    expect(Object.keys(result.fieldErrors).sort()).toEqual(['duration', 'title']); // 两个字段都报了
    expect(result.firstInvalidField).toBe('title'); // 但页面先跳到表单里靠上的"标题"
    expect(result.formError).toBe('Workshop name/skill taught is required.'); // 总错误也是标题的
  });

  it('lists every missing required field for a blank form', () => {
    // 一个字都没填就点提交
    const result = validateCreateWorkshopValues(defaultCreateWorkshopFormValues);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.fieldErrors).sort()).toEqual(
      ['category', 'contactNumber', 'date', 'detailsConfirmed', 'duration', 'hostName', 'time', 'title'] // 人数是选填，不在里面
    );
    expect(result.firstInvalidField).toBe('hostName'); // 表单第一个字段
  });

  it('falls back to the generic message when the only error is on a field outside the ordered list', () => {
    // isOnline 不在"跳转顺序"列表里。塞一个非布尔值让 zod 报错，检查总错误会用兜底文字，而不是 null 或 undefined
    const result = validateCreateWorkshopValues(makeValues({ isOnline: 'yes' as unknown as boolean }));
    expect(result.isValid).toBe(false);
    expect(result.firstInvalidField).toBeNull(); // 找不到可以跳的字段
    expect(result.formError).toBe(CREATE_WORKSHOP_VALIDATION_ERROR_MESSAGE); // 兜底文字
  });
});

describe('normalizeAustralianContactNumber', () => {
  it('removes spaces, dashes, brackets and the plus sign', () => {
    expect(normalizeAustralianContactNumber('+61 (0)412-345 678')).toBe('610412345678'); // 只留数字
  });

  it('also removes letters, so digits hidden inside text still count', () => {
    // 记录现状："call 0412 345 678" 会变成合法号码。规则是"去掉所有非数字"，不是"只允许数字和分隔符"
    expect(normalizeAustralianContactNumber('call 0412 345 678')).toBe('0412345678');
  });
});

describe('isCreateWorkshopFormSubmittable', () => {
  it('is true when every required field has text and the checkbox is ticked', () => {
    expect(isCreateWorkshopFormSubmittable(makeValues())).toBe(true);
  });

  it('is false when the form values are missing entirely', () => {
    expect(isCreateWorkshopFormSubmittable(undefined)).toBe(false); // 表单还没初始化
    expect(isCreateWorkshopFormSubmittable({})).toBe(false); // 空对象
  });

  // 7 个必填文字字段，挨个清空，每次只缺一个
  it.each(['hostName', 'title', 'category', 'contactNumber', 'date', 'time', 'duration'] as const)(
    'is false when %s is blank or only spaces',
    (field) => {
      expect(isCreateWorkshopFormSubmittable(makeValues({ [field]: '' }))).toBe(false); // 空
      expect(isCreateWorkshopFormSubmittable(makeValues({ [field]: '  ' }))).toBe(false); // 只有空格
    }
  );

  it('is false when the details checkbox is not ticked', () => {
    expect(isCreateWorkshopFormSubmittable(makeValues({ detailsConfirmed: false }))).toBe(false);
  });

  it('only checks that fields are present, not that they are valid', () => {
    // 按钮能点 ≠ 能提交成功：格式错的号码和时长，按钮仍然可以点，点了以后由 validateCreateWorkshopValues 拦下并显示错误
    const values = makeValues({ contactNumber: '123', duration: '0' });
    expect(isCreateWorkshopFormSubmittable(values)).toBe(true); // 按钮可点
    expect(validateCreateWorkshopValues(values).isValid).toBe(false); // 但完整校验不通过
  });

  it('does not require maxParticipants', () => {
    expect(isCreateWorkshopFormSubmittable(makeValues({ maxParticipants: '' }))).toBe(true); // 选填
  });
});
