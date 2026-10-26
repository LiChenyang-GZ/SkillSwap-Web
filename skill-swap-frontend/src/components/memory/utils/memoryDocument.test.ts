// 单元测试 6（纯逻辑、字符串解析）：回忆文章（memory）的 Markdown 文档
// 测什么：一篇回忆存成一段文本，开头有一块 "front matter"（两行 --- 中间的 key: value，放标题和封面），下面是正文
//         build：把数据库里的一条记录拼成这段文本；parse：从文本里拆出标题、封面、正文、所有图片视频链接；strip：只去掉 front matter
// 属于哪一层：单元测试。纯函数，输入字符串、输出字符串 / 对象
// 为什么要测：解析错了，编辑器里标题会丢、封面会变空，或者文章页面顶上露出一段 "title: ..." 乱码
import { describe, it, expect } from 'vitest'; // 测试框架
import { buildMemoryDocumentFromEntry, parseMemoryDocument, stripMemoryFrontMatter } from './memoryDocument'; // 被测函数
import type { MemoryEntry } from '../../../types/memory'; // 回忆记录的类型

// 测试数据工厂：一条普通的回忆记录（正文里没有 front matter）
function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'm1', // id
    title: 'First Meetup', // ⭐ 标题
    slug: 'first-meetup', // 用不到
    coverUrl: 'https://cdn.example.com/cover.png', // ⭐ 封面
    content: 'We met at the library.\n\nIt was fun.', // ⭐ 正文（两段）
    mediaUrls: [], // 用不到
    status: 'draft', // 用不到
    ...overrides, // 覆盖
  };
}

// 一段标准的文档：front matter + 正文
const DOC = '---\ntitle: First Meetup\ncover: https://cdn.example.com/cover.png\n---\nHello world';

describe('parseMemoryDocument', () => {
  it('reads the title, cover and body from the front matter', () => {
    expect(parseMemoryDocument(DOC)).toEqual({
      body: 'Hello world', // 正文：front matter 后面的部分
      title: 'First Meetup', // 标题
      coverUrl: 'https://cdn.example.com/cover.png', // 封面
      mediaUrls: ['https://cdn.example.com/cover.png'], // 全文扫到的图片链接（front matter 里的封面也算）
    });
  });

  it('handles Windows line endings (\\r\\n) the same as \\n', () => {
    // 在 Windows 上编辑、复制粘贴过来的文本，换行是 \r\n。防的 bug：正则只认 \n，结果整个 front matter 认不出来
    const parsed = parseMemoryDocument(DOC.replace(/\n/g, '\r\n')); // 把所有 \n 换成 \r\n
    expect(parsed.title).toBe('First Meetup'); // 标题照样能读出来
    expect(parsed.body).toBe('Hello world'); // 正文里也没有残留的 \r
  });

  it('handles a byte-order mark (BOM) at the very start', () => {
    // BOM 是某些编辑器（比如 Windows 记事本）在文件开头偷偷加的一个看不见的字符
    expect(parseMemoryDocument(`﻿${DOC}`).title).toBe('First Meetup');
  });

  it('handles blank lines before the opening ---', () => {
    expect(parseMemoryDocument(`\n\n${DOC}`).title).toBe('First Meetup'); // 开头多敲了几个回车
  });

  it('returns the whole text as body when there is no front matter', () => {
    const parsed = parseMemoryDocument('Just some text');
    expect(parsed).toMatchObject({ title: '', coverUrl: '', body: 'Just some text' }); // toMatchObject：只比较列出来的字段
  });

  it('does not treat an unclosed front matter block as front matter', () => {
    // 只有开头的 ---，没有结尾的 --- → 不当成 front matter，整段都是正文
    const text = '---\ntitle: Oops\nno closing line';
    expect(parseMemoryDocument(text)).toMatchObject({ title: '', body: text });
  });

  it('keeps everything after the first colon as the value', () => {
    // 标题里本身带冒号，只按第一个冒号切
    expect(parseMemoryDocument('---\ntitle: Trip: Day 1\n---\n').title).toBe('Trip: Day 1');
  });

  it('skips lines with no key', () => {
    // 没有冒号的行、冒号在第一个字符的行，都跳过，不会报错
    const parsed = parseMemoryDocument('---\njust words\n: no key\ntitle: Kept\n---\nbody');
    expect(parsed.title).toBe('Kept');
  });

  it('also accepts "Title" with a capital T', () => {
    expect(parseMemoryDocument('---\nTitle: Capital\n---\n').title).toBe('Capital');
  });

  describe('cover value formats', () => {
    // 封面这一行历史上被写成过好几种样子，都要能拿到里面的 URL。每一行：[说明, front matter 里的那一行]
    it.each([
      ['plain URL', 'cover: https://x.com/a.png'],
      ['double-quoted', 'cover: "https://x.com/a.png"'],
      ['single-quoted', "cover: 'https://x.com/a.png'"],
      ['Markdown image', 'cover: ![cover](https://x.com/a.png)'],
      ['HTML <img>', 'cover: <img src="https://x.com/a.png" width="400" />'],
      ['coverUrl key', 'coverUrl: https://x.com/a.png'],
      ['image key', 'image: https://x.com/a.png'],
      ['imageUrl key', 'imageUrl: https://x.com/a.png'],
    ])('reads the URL from a %s', (_label, line) => {
      expect(parseMemoryDocument(`---\n${line}\n---\n`).coverUrl).toBe('https://x.com/a.png');
    });

    it('prefers "cover" over "image" when both are present', () => {
      expect(parseMemoryDocument('---\nimage: https://x.com/b.png\ncover: https://x.com/a.png\n---\n').coverUrl).toBe(
        'https://x.com/a.png'
      );
    });

    it('returns an empty cover for empty quotes', () => {
      expect(parseMemoryDocument('---\ncover: ""\n---\n').coverUrl).toBe(''); // 引号里什么都没有
    });
  });

  describe('media URLs', () => {
    it('collects Markdown images, HTML images and bare media links, without duplicates', () => {
      const body = [
        '![a](https://x.com/1.png)', // Markdown 图片
        '<img src="https://x.com/2.jpg" width="400">', // HTML 图片（正文插图带宽度时用这种）
        'Watch https://x.com/3.mp4?t=10 now', // 裸链接，视频，带参数
        'Read https://x.com/article', // 裸链接，但不是图片视频 → 不收
        '![again](https://x.com/1.png)', // 重复的 → 只收一次
      ].join('\n');
      expect(parseMemoryDocument(body).mediaUrls.sort()).toEqual(
        ['https://x.com/1.png', 'https://x.com/2.jpg', 'https://x.com/3.mp4?t=10'].sort()
      );
    });
  });
});

describe('buildMemoryDocumentFromEntry', () => {
  it('wraps plain content with a front matter holding title and cover', () => {
    expect(buildMemoryDocumentFromEntry(makeEntry())).toBe(
      '---\ntitle: First Meetup\ncover: https://cdn.example.com/cover.png\n---\n\nWe met at the library.\n\nIt was fun.'
    );
  });

  it('returns content unchanged when it already starts with front matter', () => {
    // 编辑器保存时存的是整篇文档（包括 front matter），再打开时不能再套一层
    expect(buildMemoryDocumentFromEntry(makeEntry({ content: DOC }))).toBe(DOC);
  });

  it('writes empty values when title and cover are missing', () => {
    const doc = buildMemoryDocumentFromEntry(makeEntry({ title: '', coverUrl: undefined, content: undefined }));
    expect(doc).toBe('---\ntitle: \ncover: \n---\n\n'); // 不会出现 "undefined" 这几个字
  });

  it('turns newlines in the cover URL into spaces so they cannot break the front matter', () => {
    // 如果封面里有换行，会多出一行，front matter 就乱了
    const doc = buildMemoryDocumentFromEntry(makeEntry({ coverUrl: 'https://x.com/a.png\ntitle: hacked' }));
    expect(parseMemoryDocument(doc).title).toBe('First Meetup'); // 标题没被覆盖成 hacked
  });
});

describe('round trip: build → parse', () => {
  // 往返测试：把记录拼成文档，再解析回来，标题、封面应该和原来一样
  it('restores the title and cover, and the body after one blank separator line', () => {
    const entry = makeEntry();
    const parsed = parseMemoryDocument(buildMemoryDocumentFromEntry(entry));
    expect(parsed.title).toBe(entry.title); // 标题还原
    expect(parsed.coverUrl).toBe(entry.coverUrl); // 封面还原
    // 正文前面多了一个空行：build 在 --- 和正文之间放了一个空行，parse 只吃掉 --- 后面那一个换行
    // Markdown 会忽略开头的空行，所以页面上看不出来（记录现状）
    expect(parsed.body).toBe(`\n${entry.content}`);
  });

  it('restores a title that contains a colon', () => {
    const parsed = parseMemoryDocument(buildMemoryDocumentFromEntry(makeEntry({ title: 'Trip: Day 1' })));
    expect(parsed.title).toBe('Trip: Day 1');
  });

  it('is stable when building again from an already-built document', () => {
    // 存进数据库的是 build 出来的整篇文档；下次打开再 build 一次，应该原样返回，不会越套越多
    const once = buildMemoryDocumentFromEntry(makeEntry());
    const twice = buildMemoryDocumentFromEntry(makeEntry({ content: once }));
    expect(twice).toBe(once);
  });
});

describe('stripMemoryFrontMatter', () => {
  it('returns an empty string for missing content', () => {
    expect(stripMemoryFrontMatter(undefined)).toBe(''); // 没有内容
    expect(stripMemoryFrontMatter('')).toBe(''); // 空内容
  });

  it('removes the front matter and keeps the body', () => {
    expect(stripMemoryFrontMatter(DOC)).toBe('Hello world'); // 文章页只显示正文
  });

  it('handles Windows line endings', () => {
    expect(stripMemoryFrontMatter(DOC.replace(/\n/g, '\r\n'))).toBe('Hello world');
  });

  it('returns the text unchanged when there is no front matter', () => {
    expect(stripMemoryFrontMatter('No header here')).toBe('No header here');
  });
});
