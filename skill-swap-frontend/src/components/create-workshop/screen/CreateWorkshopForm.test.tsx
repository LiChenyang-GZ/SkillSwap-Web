// 组件测试（带状态的流程）：创建 workshop 表单，从填写到提交
// 测什么：用户的完整操作：填表 → 点提交 → 格式不对就在页面上显示错误、光标跳到出错的框 → 改对 → 再提交 → 发给后端 → 跳到个人中心
// 属于哪一层：组件测试。表单组件和它的三个 hook（表单状态、校验、提交）全是真的
// 哪些是假的：useApp（全局 context，里面的 createWorkshop 会真的调后端，setCurrentPage 会切页面）和 toast 弹窗
// 和 createWorkshopValidation.test.ts 的分工：那边测"规则对不对"（几十种输入），这边测"规则有没有正确接到界面上"（什么时候显示、显示在哪、拦没拦住提交）
import { describe, it, expect, vi, beforeEach } from 'vitest'; // 测试框架
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // waitFor：反复检查，直到断言通过或超时；fireEvent：直接触发一个 DOM 事件
import userEvent from '@testing-library/user-event'; // 模拟真实用户的点击、打字
import { CreateWorkshopForm } from './CreateWorkshopForm'; // 被测组件
import { useApp } from '../../../contexts/AppContext'; // 下面会被换成假的

vi.mock('../../../contexts/AppContext', () => ({ useApp: vi.fn() })); // 换掉全局 context：不需要登录、不需要真后端
vi.mock('sonner', () => ({ toast: { loading: vi.fn(() => 'toast-1'), dismiss: vi.fn() } })); // "正在创建..." 的提示

const createWorkshop = vi.fn(); // 假的"创建 workshop"：测试里决定它成功还是失败
const setCurrentPage = vi.fn(); // 假的"切换页面"：检查有没有跳到 dashboard

beforeEach(() => {
  vi.clearAllMocks(); // 清空调用记录
  // useApp 返回一个只有这两个函数的对象（真实的 context 有几十个字段，这个组件只用这两个）
  vi.mocked(useApp).mockReturnValue({ createWorkshop, setCurrentPage } as unknown as ReturnType<typeof useApp>);
  // jsdom 没有实现 scrollIntoView（它不真的排版、不能滚动），表单出错时会调用它，所以补一个什么都不做的假函数
  Element.prototype.scrollIntoView = vi.fn();
});

// 渲染表单，返回一个虚拟用户和常用元素
function renderForm() {
  const user = userEvent.setup();
  const { container } = render(<CreateWorkshopForm />);
  const submit = () => screen.getByRole('button', { name: /Create Workshop|Creating/ }); // 提交按钮（提交中文字会变）
  return { user, container, submit };
}

// 把表单填完整。phone 可以传进来，用来测试格式错误
async function fillForm(user: ReturnType<typeof userEvent.setup>, container: HTMLElement, phone = '0412 345 678') {
  await user.type(screen.getByLabelText('Host name *'), 'Alice'); // getByLabelText：按 <label> 的文字找到对应的输入框（和用户看到的一样）
  await user.type(screen.getByLabelText('Workshop Name / Skill Taught *'), 'Intro to Pottery');
  // 类别是 Radix 的下拉框：弹出层在 jsdom 里不好点，但它在 <form> 里会额外放一个隐藏的原生 <select>，改它的值等于选中
  fireEvent.change(container.querySelector('select')!, { target: { value: 'Creative' } });
  await user.type(screen.getByLabelText('Contact number *'), phone);
  fireEvent.change(screen.getByLabelText('Confirmed workshop date *'), { target: { value: '2099-01-01' } }); // 日期框不能一个字一个字地打，直接设置值
  fireEvent.change(screen.getByLabelText('Confirmed workshop time *'), { target: { value: '10:00' } }); // 时间框同上
  await user.type(screen.getByLabelText('Duration (minutes) *'), '60');
  await user.click(screen.getByLabelText('I confirm that the above details are accurate *')); // 勾选"信息无误"
}

describe('CreateWorkshopForm', () => {
  it('keeps the submit button disabled until every required field is filled', async () => {
    const { user, container, submit } = renderForm();
    expect(submit()).toBeDisabled(); // 空表单：不能点

    await fillForm(user, container);
    expect(submit()).toBeEnabled(); // 填完：可以点
  });

  it('does not show any errors before the first submit', async () => {
    const { user, container } = renderForm();
    await fillForm(user, container, '123'); // 号码格式不对
    expect(screen.queryByText('Please enter a valid Australian 10-digit number.')).not.toBeInTheDocument(); // 用户还在填，先不打扰
  });

  it('shows the error, marks the field and moves focus to it when submitting a bad phone number', async () => {
    const { user, container, submit } = renderForm();
    await fillForm(user, container, '123'); // 号码只有 3 位

    await user.click(submit()); // 点提交

    // 错误出现两次：顶部的总提示 + 号码框下面的字段提示。getAllByText：找所有匹配的元素
    expect(screen.getAllByText('Please enter a valid Australian 10-digit number.')).toHaveLength(2);
    const phone = screen.getByLabelText('Contact number *');
    expect(phone).toHaveAttribute('aria-invalid', 'true'); // 给读屏软件标记"这个框有错"，红框样式也靠它
    await waitFor(() => expect(phone).toHaveFocus()); // 光标跳到出错的框（代码在下一帧才 focus，所以用 waitFor 等一下）
    expect(createWorkshop).not.toHaveBeenCalled(); // ⭐ 没有发给后端
  });

  it('clears the error as soon as the field is fixed, then submits the cleaned-up values', async () => {
    const { user, container, submit } = renderForm();
    await fillForm(user, container, '123');
    await user.click(submit()); // 第一次提交：报错
    createWorkshop.mockResolvedValue({ id: 'new' }); // 后端：创建成功

    const phone = screen.getByLabelText('Contact number *');
    await user.clear(phone); // 清空号码框
    await user.type(phone, '0412-345-678'); // 改成正确的（带横线）
    expect(screen.queryByText('Please enter a valid Australian 10-digit number.')).not.toBeInTheDocument(); // 提交过一次以后，错误会实时更新

    await user.click(submit()); // 第二次提交

    await waitFor(() => expect(createWorkshop).toHaveBeenCalledTimes(1)); // 发给后端了
    expect(createWorkshop).toHaveBeenCalledWith(
      expect.objectContaining({
        hostName: 'Alice',
        category: 'Creative',
        contactNumber: '0412345678', // 横线被去掉
        duration: 60, // 字符串变成数字
        maxParticipants: null, // 没填 → null
        location: '', // 线下
        description: 'Intro to Pottery', // 没填"其他信息"时，描述用标题代替
        detailsConfirmed: true,
      })
    );
    expect(setCurrentPage).toHaveBeenCalledWith('dashboard'); // 成功后跳到个人中心
  });

  it('stays on the form and re-enables the button when the backend fails', async () => {
    createWorkshop.mockResolvedValue(null); // 后端：失败（AppContext 里失败时返回 null，并自己弹错误提示）
    const { user, container, submit } = renderForm();
    await fillForm(user, container);

    await user.click(submit());

    await waitFor(() => expect(submit()).toHaveTextContent('Create Workshop')); // 按钮文字恢复
    expect(submit()).toBeEnabled(); // 可以再试一次
    expect(setCurrentPage).not.toHaveBeenCalled(); // ⭐ 没有跳走，用户填的内容还在
    expect(screen.getByLabelText('Host name *')).toHaveValue('Alice');
  });

  it('shows "Creating..." and ignores a second click while the request is in flight', async () => {
    let finish!: (value: unknown) => void; // 手动控制后端什么时候返回
    createWorkshop.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { user, container, submit } = renderForm();
    await fillForm(user, container);

    await user.click(submit()); // 第一次点
    expect(submit()).toHaveTextContent('Creating...'); // 显示"创建中"
    expect(submit()).toBeDisabled(); // 按钮变灰
    await user.click(submit()); // 再点一次（灰的按钮点不了）

    finish({ id: 'new' }); // 后端返回
    await waitFor(() => expect(setCurrentPage).toHaveBeenCalledWith('dashboard'));
    expect(createWorkshop).toHaveBeenCalledTimes(1); // ⭐ 只创建了一个 workshop，没有重复提交
  });
});
