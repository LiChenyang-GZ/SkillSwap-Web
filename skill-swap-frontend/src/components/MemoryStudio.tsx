import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { memoryAPI, resolveAssetUrl } from '../lib/api';
import { MemoryEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Bold,
  Eye,
  FilePenLine,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  RefreshCw,
  Split,
  Strikethrough,
  Underline,
  Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

type EditorMode = 'write' | 'preview' | 'split';

interface ParsedMemoryDocument {
  body: string;
  title: string;
  coverUrl: string;
  mediaUrls: string[];
}

const EMPTY_DOC = `---
title:
cover:
---

#

Write your memory story here...
`;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseFrontMatter(documentText: string): { meta: Record<string, string>; body: string } {
  const normalized = documentText.replace(/\r\n/g, '\n');
  const match = normalized.match(/^\uFEFF?(?:\s*\n)*---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, body: normalized };
  }

  const metaBlock = match[1];
  const meta: Record<string, string> = {};
  metaBlock.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) return;
    meta[key] = value;
  });

  return {
    meta,
    body: normalized.slice(match[0].length),
  };
}

function normalizeCoverValue(value?: string): string {
  if (!value) return '';
  const unquoted = value.trim().replace(/^['\"]|['\"]$/g, '');
  if (!unquoted) return '';

  const markdownImage = unquoted.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  if (markdownImage?.[1]) {
    return markdownImage[1].trim();
  }

  return unquoted;
}

function extractMediaUrls(markdown: string): string[] {
  const urls = new Set<string>();

  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let imageMatch: RegExpExecArray | null = null;
  while ((imageMatch = imageRegex.exec(markdown)) !== null) {
    const url = imageMatch[1].trim();
    if (url) urls.add(url);
  }

  const rawUrlRegex = /(https?:\/\/[^\s)]+)/g;
  let rawMatch: RegExpExecArray | null = null;
  while ((rawMatch = rawUrlRegex.exec(markdown)) !== null) {
    const url = rawMatch[1].trim();
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.mp4|\.mov|\.webm)(\?.*)?$/i.test(url)) {
      urls.add(url);
    }
  }

  return Array.from(urls);
}

function buildDocumentFromEntry(entry: MemoryEntry): string {
  const content = entry.content || '';
  if (content.startsWith('---\n')) {
    return content;
  }

  return `---
title: ${entry.title || ''}
cover: ${(entry.coverUrl || '').replace(/\n/g, ' ')}
---

${content}`;
}

function parseMemoryDocument(documentText: string): ParsedMemoryDocument {
  const { meta, body } = parseFrontMatter(documentText);

  const title = (meta.title || meta.Title || '').trim();
  const coverUrl = normalizeCoverValue(meta.cover || meta.coverUrl || meta.image || meta.imageUrl || '');
  const mediaUrls = extractMediaUrls(documentText);

  return {
    body,
    title,
    coverUrl,
    mediaUrls,
  };
}

export function MemoryStudio() {
  const { sessionToken, isAdmin, setCurrentPage } = useApp();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<string>(EMPTY_DOC);
  const [mode, setMode] = useState<EditorMode>('split');
  const [selectedStatus, setSelectedStatus] = useState<MemoryEntry['status']>('draft');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) || null,
    [entries, selectedId]
  );

  const parsedDoc = useMemo(() => parseMemoryDocument(documentText), [documentText]);
  const resolvedSlugPreview = useMemo(() => slugify(parsedDoc.title), [parsedDoc.title]);

  const loadEntries = async () => {
    if (!sessionToken) return;
    setIsLoading(true);
    try {
      const data = await memoryAPI.getAllForAdmin(sessionToken);
      setEntries(data);

      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load memories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, [sessionToken]);

  useEffect(() => {
    if (!selectedEntry) return;
    setDocumentText(buildDocumentFromEntry(selectedEntry));
    setSelectedStatus(selectedEntry.status || 'draft');
  }, [selectedEntry]);

  const handleCreateNew = () => {
    setSelectedId(null);
    setDocumentText(EMPTY_DOC);
    setSelectedStatus('draft');
  };

  const updateSelection = (nextText: string, selectionStart: number, selectionEnd: number) => {
    setDocumentText(nextText);
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      editorRef.current.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const insertAroundSelection = (prefix: string, suffix: string, placeholder: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = documentText.slice(start, end) || placeholder;

    const next = `${documentText.slice(0, start)}${prefix}${selected}${suffix}${documentText.slice(end)}`;
    const nextStart = start + prefix.length;
    const nextEnd = nextStart + selected.length;
    updateSelection(next, nextStart, nextEnd);
  };

  const insertLinePrefix = (prefix: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const lineStart = documentText.lastIndexOf('\n', start - 1) + 1;
    const next = `${documentText.slice(0, lineStart)}${prefix}${documentText.slice(lineStart)}`;
    const cursor = start + prefix.length;
    updateSelection(next, cursor, cursor);
  };

  const insertStandalone = (snippet: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const next = `${documentText.slice(0, start)}${snippet}${documentText.slice(end)}`;
    const cursor = start + snippet.length;
    updateSelection(next, cursor, cursor);
  };

  const insertTextAtRange = (text: string, start?: number, end?: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sourceText = editor.value;
    const selectionStart = start ?? editor.selectionStart;
    const selectionEnd = end ?? editor.selectionEnd;
    const next = `${sourceText.slice(0, selectionStart)}${text}${sourceText.slice(selectionEnd)}`;
    const cursor = selectionStart + text.length;
    updateSelection(next, cursor, cursor);
  };

  const uploadAndInsertImage = async (file: File, start?: number, end?: number) => {
    if (!sessionToken) {
      toast.error('Please sign in.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await memoryAPI.uploadMediaByAdmin(file, sessionToken);
      const fallbackAlt = file.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
      const markdown = `![${fallbackAlt || 'image'}](${resolveAssetUrl(result.url || result.path)})`;
      insertTextAtRange(markdown, start, end);
      toast.success('Image uploaded and inserted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditorPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (isUploadingImage) {
      return;
    }

    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    event.preventDefault();
    void uploadAndInsertImage(file, start, end);
  };

  const handlePickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    await uploadAndInsertImage(file);
  };

  const handleSave = async (forcedStatus?: MemoryEntry['status']) => {
    if (!sessionToken) {
      toast.error('Please sign in.');
      return;
    }

    if (!parsedDoc.title) {
      toast.error('Please provide a card title in front matter: title: ...');
      return;
    }

    setIsSaving(true);
    try {
      const statusToPersist = forcedStatus || selectedStatus;
      const payload: Partial<MemoryEntry> = {
        title: parsedDoc.title,
        slug: undefined,
        coverUrl: parsedDoc.coverUrl || undefined,
        content: documentText,
        status: statusToPersist,
        mediaUrls: parsedDoc.mediaUrls,
      };

      if (selectedId) {
        const updated = await memoryAPI.updateByAdmin(selectedId, payload, sessionToken);
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedStatus(updated.status || statusToPersist);
        toast.success('Saved.');
      } else {
        const created = await memoryAPI.createByAdmin(payload, sessionToken);
        setEntries((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setSelectedStatus(created.status || statusToPersist);
        toast.success('Saved.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center px-4">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Only admins can edit memories.</p>
            <Button onClick={() => setCurrentPage('memory')}>Back to Memory</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Memory Studio</h1>
            <p className="text-muted-foreground mt-1">Markdown editor with backend-generated slug and explicit publish workflow.</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={() => void loadEntries()} disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
            <Button
              variant={selectedStatus === 'draft' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedStatus('draft');
                void handleSave('draft');
              }}
              disabled={isSaving || isUploadingImage}
            >
              Save Draft
            </Button>
            <Button
              variant={selectedStatus === 'published' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedStatus('published');
                void handleSave('published');
              }}
              disabled={isSaving || isUploadingImage}
            >
              Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-auto">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No memory entries yet.</p>
              ) : (
                entries.map((entry) => (
                  <button
                    key={entry.id}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      entry.id === selectedId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <div className="font-medium line-clamp-1">{entry.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">/{entry.slug}</div>
                    <Badge variant="secondary" className="mt-2">{entry.status}</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg">Markdown Editor</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant={mode === 'write' ? 'default' : 'outline'} size="sm" onClick={() => setMode('write')}>
                    <FilePenLine className="w-4 h-4 mr-1" />
                    Write
                  </Button>
                  <Button variant={mode === 'preview' ? 'default' : 'outline'} size="sm" onClick={() => setMode('preview')}>
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant={mode === 'split' ? 'default' : 'outline'} size="sm" onClick={() => setMode('split')}>
                    <Split className="w-4 h-4 mr-1" />
                    Split
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border p-2 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('# ')}><Heading1 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('## ')}><Heading2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('**', '**', 'bold')}><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('*', '*', 'italic')}><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('<u>', '</u>', 'underline')}><Underline className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('~~', '~~', 'strike')}><Strikethrough className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('> ')}><Quote className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('- ')}><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('1. ')}><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('[', '](https://)', 'link text')}><Link2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('![', '](https://)', 'alt text')}><Image className="w-4 h-4" /></Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  title="Upload image"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertStandalone('\n\n---\n\n')}><Minus className="w-4 h-4" /></Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePickImage(e)}
                />
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Front matter example:
                <pre className="mt-2 overflow-auto text-xs">
{`---
title: Summer Showcase 2026
cover: https://image-url
---`}
                </pre>
                <p className="mt-2">Save Draft and Publish both persist immediately. Slug is generated by backend.</p>
                <p className="mt-1">The editor supports direct image paste and auto-inserts Markdown image syntax after upload.</p>
              </div>

              <div className={`grid gap-4 ${mode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {(mode === 'write' || mode === 'split') && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Write</div>
                    <textarea
                      ref={editorRef}
                      value={documentText}
                      onChange={(e) => setDocumentText(e.target.value)}
                      onPaste={handleEditorPaste}
                      className="w-full min-h-[520px] rounded-md border border-input bg-input-background px-3 py-2 text-sm font-mono leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      placeholder="Write markdown with front matter..."
                    />
                  </div>
                )}

                {(mode === 'preview' || mode === 'split') && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Preview</div>
                    <div className="min-h-[520px] rounded-md border border-border bg-card px-4 py-4 overflow-auto prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }) => (
                            <img
                              src={resolveAssetUrl(src)}
                              alt={alt || ''}
                              className="w-full rounded-lg border border-border/60"
                              loading="lazy"
                            />
                          ),
                        }}
                      >
                        {parsedDoc.body || '*Empty content*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border p-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Detected metadata:</span>
                <Badge variant="secondary">title: {parsedDoc.title || 'N/A'}</Badge>
                <Badge variant="secondary">slug: {resolvedSlugPreview || 'Auto by backend'}</Badge>
                <Badge variant="secondary">status: {selectedStatus}</Badge>
                <Badge variant="secondary">media: {parsedDoc.mediaUrls.length}</Badge>
                {isUploadingImage && <Badge variant="secondary">uploading image...</Badge>}
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={() => setCurrentPage('memory')}>
                  <Eye className="w-4 h-4 mr-2" />
                  Open Public Memory Wall
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-right">Only published memories are visible on the public wall.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
