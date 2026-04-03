import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { memoryAPI, resolveAssetUrl } from '../lib/api';
import { MemoryEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  ArchiveRestore,
  Bold,
  Eye,
  EyeOff,
  FilePenLine,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Send,
  Split,
  Strikethrough,
  Trash2,
  Underline,
  Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

type EditorMode = 'write' | 'preview' | 'split';
type ConflictAction = 'save' | 'status';

interface ParsedMemoryDocument {
  body: string;
  title: string;
  coverUrl: string;
  mediaUrls: string[];
}

interface ConflictDialogState {
  action: ConflictAction;
  entryId: string | null;
  myDocument: string;
  serverEntry: MemoryEntry | null;
  serverEntries: MemoryEntry[];
}

const EMPTY_DOC = `---
title:
cover:
---

#

Write your memory story here...
`;

const ENTRY_PAGE_SIZE = 10;

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

function toStatusLabel(status: MemoryEntry['status']): string {
  if (status === 'archived') return 'hidden';
  return status;
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status?: number }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
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
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState | null>(null);
  const [deleteDialogEntry, setDeleteDialogEntry] = useState<MemoryEntry | null>(null);
  const [entryPage, setEntryPage] = useState(1);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextSelectionSyncRef = useRef(false);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) || null,
    [entries, selectedId]
  );

  const parsedDoc = useMemo(() => parseMemoryDocument(documentText), [documentText]);
  const resolvedSlugPreview = useMemo(() => slugify(parsedDoc.title), [parsedDoc.title]);
  const activeStatus: MemoryEntry['status'] = selectedEntry?.status || 'draft';
  const isReadOnlyEntry = Boolean(selectedEntry && activeStatus !== 'draft');
  const editorActionsDisabled = isSaving || isUploadingImage || isReadOnlyEntry;
  const baseDocumentText = useMemo(
    () => (selectedEntry ? buildDocumentFromEntry(selectedEntry) : EMPTY_DOC),
    [selectedEntry]
  );
  const isDraftContext = !selectedEntry || activeStatus === 'draft';
  const hasUnsavedDraftChanges = isDraftContext && documentText !== baseDocumentText;

  const totalEntryPages = useMemo(
    () => Math.max(1, Math.ceil(entries.length / ENTRY_PAGE_SIZE)),
    [entries.length]
  );

  const pagedEntries = useMemo(() => {
    const start = (entryPage - 1) * ENTRY_PAGE_SIZE;
    return entries.slice(start, start + ENTRY_PAGE_SIZE);
  }, [entries, entryPage]);

  const openConflictDialog = async (params: {
    action: ConflictAction;
    entryId: string | null;
    myDocument: string;
  }): Promise<boolean> => {
    if (!sessionToken || !params.entryId) {
      toast.error('Conflict detected. Please refresh and retry.');
      return false;
    }

    try {
      const latestEntries = await memoryAPI.getAllForAdmin(sessionToken);
      const latestEntry = latestEntries.find((item) => item.id === params.entryId) || null;

      setConflictDialog({
        action: params.action,
        entryId: params.entryId,
        myDocument: params.myDocument,
        serverEntry: latestEntry,
        serverEntries: latestEntries,
      });
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Conflict detected, but failed to load the latest server version.');
      return false;
    }
  };

  const handleKeepMyChangesAfterConflict = () => {
    if (!conflictDialog) return;

    const { entryId, myDocument, serverEntries, serverEntry } = conflictDialog;

    if (serverEntries.length > 0) {
      skipNextSelectionSyncRef.current = true;
      setEntries(serverEntries);

      if (entryId && serverEntries.some((item) => item.id === entryId)) {
        setSelectedId(entryId);
        setSelectedStatus(serverEntry?.status || 'draft');
      } else {
        setSelectedId(serverEntries[0].id);
        setSelectedStatus(serverEntries[0].status || 'draft');
      }
    }

    setDocumentText(myDocument);
    setConflictDialog(null);
    toast.info('Kept your local edits. Server metadata has been refreshed.');
  };

  const handleReloadServerVersionAfterConflict = () => {
    if (!conflictDialog) return;

    const { entryId, serverEntry, serverEntries } = conflictDialog;
    setEntries(serverEntries);

    if (serverEntry) {
      setSelectedId(serverEntry.id);
      setSelectedStatus(serverEntry.status || 'draft');
      setDocumentText(buildDocumentFromEntry(serverEntry));
    } else if (serverEntries.length > 0) {
      const fallback = entryId
        ? serverEntries.find((item) => item.id === entryId) || serverEntries[0]
        : serverEntries[0];

      setSelectedId(fallback.id);
      setSelectedStatus(fallback.status || 'draft');
      setDocumentText(buildDocumentFromEntry(fallback));
    } else {
      setSelectedId(null);
      setSelectedStatus('draft');
      setDocumentText(EMPTY_DOC);
    }

    setConflictDialog(null);
    toast.success('Reloaded latest server version.');
  };

  const loadEntries = async () => {
    if (!sessionToken) return;
    setIsLoading(true);
    try {
      const data = await memoryAPI.getAllForAdmin(sessionToken);
      setEntries(data);
      setEntryPage(1);

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

    if (skipNextSelectionSyncRef.current) {
      skipNextSelectionSyncRef.current = false;
      return;
    }

    setDocumentText(buildDocumentFromEntry(selectedEntry));
    setSelectedStatus(selectedEntry.status || 'draft');
  }, [selectedEntry]);

  useEffect(() => {
    if (entryPage > totalEntryPages) {
      setEntryPage(totalEntryPages);
    }
  }, [entryPage, totalEntryPages]);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

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
        version: selectedEntry?.version,
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
      if (getErrorStatus(error) === 409) {
        await openConflictDialog({
          action: 'save',
          entryId: selectedId,
          myDocument: documentText,
        });
        return;
      }
      toast.error('Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteDialogEntry) return;

    if (!sessionToken) {
      toast.error('Please sign in.');
      return;
    }

    setIsSaving(true);
    try {
      await memoryAPI.deleteByAdmin(deleteDialogEntry.id, sessionToken);
      setEntries((prev) => prev.filter((item) => item.id !== deleteDialogEntry.id));
      setDeleteDialogEntry(null);
      toast.success('Deleted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusForEntry = async (entry: MemoryEntry, nextStatus: MemoryEntry['status']) => {
    if (!sessionToken) {
      toast.error('Please sign in.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await memoryAPI.updateByAdmin(entry.id, { status: nextStatus, version: entry.version }, sessionToken);
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedId === entry.id) {
        setSelectedStatus(updated.status || nextStatus);
      }
      toast.success(`Memory ${toStatusLabel(updated.status || nextStatus)}.`);
    } catch (error) {
      console.error(error);
      if (getErrorStatus(error) === 409) {
        await openConflictDialog({
          action: 'status',
          entryId: entry.id,
          myDocument: documentText,
        });
        return;
      }
      toast.error('Failed to update memory status.');
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
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Memory Studio</h1>
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No memory entries yet.</p>
              ) : (
                pagedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      entry.id === selectedId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="text-left flex-1 min-w-0"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <div className="font-medium line-clamp-1">{entry.title}</div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="capitalize">{toStatusLabel(entry.status)}</Badge>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              aria-label="More actions"
                              onClick={() => setSelectedId(entry.id)}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="bottom" align="start" alignOffset={-8} sideOffset={8} className="w-48">
                            {entry.status === 'draft' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void handleStatusForEntry(entry, 'published');
                                }}
                                disabled={isSaving || isUploadingImage}
                              >
                                <Send className="w-4 h-4" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            {entry.status === 'published' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void handleStatusForEntry(entry, 'archived');
                                }}
                                disabled={isSaving || isUploadingImage}
                              >
                                <EyeOff className="w-4 h-4" />
                                Hide (Archive)
                              </DropdownMenuItem>
                            )}
                            {entry.status === 'published' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void handleStatusForEntry(entry, 'draft');
                                }}
                                disabled={isSaving || isUploadingImage}
                              >
                                <ArchiveRestore className="w-4 h-4" />
                                Move to Draft
                              </DropdownMenuItem>
                            )}
                            {entry.status === 'archived' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void handleStatusForEntry(entry, 'draft');
                                }}
                                disabled={isSaving || isUploadingImage}
                              >
                                <ArchiveRestore className="w-4 h-4" />
                                Move to Draft
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                setDeleteDialogEntry(entry);
                              }}
                              disabled={isSaving || isUploadingImage}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {entries.length > ENTRY_PAGE_SIZE && (
                <div className="pt-2 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEntryPage((prev) => Math.max(1, prev - 1))}
                    disabled={entryPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {entryPage} / {totalEntryPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEntryPage((prev) => Math.min(totalEntryPages, prev + 1))}
                    disabled={entryPage >= totalEntryPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg">Markdown Editor</CardTitle>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {isDraftContext && (
                    <Button
                      variant={hasUnsavedDraftChanges ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedStatus('draft');
                        void handleSave('draft');
                      }}
                      disabled={isSaving || isUploadingImage || !hasUnsavedDraftChanges}
                      className={hasUnsavedDraftChanges ? '' : 'bg-transparent'}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Draft
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={mode === 'write' ? 'bg-muted text-foreground border-border' : ''}
                    onClick={() => setMode('write')}
                  >
                    <FilePenLine className="w-4 h-4 mr-1" />
                    Write
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={mode === 'preview' ? 'bg-muted text-foreground border-border' : ''}
                    onClick={() => setMode('preview')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={mode === 'split' ? 'bg-muted text-foreground border-border' : ''}
                    onClick={() => setMode('split')}
                  >
                    <Split className="w-4 h-4 mr-1" />
                    Split
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isReadOnlyEntry && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p>
                    This memory is <span className="font-medium">{toStatusLabel(activeStatus)}</span> and read-only.
                    Move it to <span className="font-medium">draft</span> from the entry menu to continue editing content.
                  </p>
                </div>
              )}

              <div className="rounded-md border border-border p-2 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('# ')} disabled={editorActionsDisabled}><Heading1 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('## ')} disabled={editorActionsDisabled}><Heading2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('**', '**', 'bold')} disabled={editorActionsDisabled}><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('*', '*', 'italic')} disabled={editorActionsDisabled}><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('<u>', '</u>', 'underline')} disabled={editorActionsDisabled}><Underline className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('~~', '~~', 'strike')} disabled={editorActionsDisabled}><Strikethrough className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('> ')} disabled={editorActionsDisabled}><Quote className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('- ')} disabled={editorActionsDisabled}><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertLinePrefix('1. ')} disabled={editorActionsDisabled}><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('[', '](https://)', 'link text')} disabled={editorActionsDisabled}><Link2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertAroundSelection('![', '](https://)', 'alt text')} disabled={editorActionsDisabled}><Image className="w-4 h-4" /></Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={editorActionsDisabled}
                  title="Upload image"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertStandalone('\n\n---\n\n')} disabled={editorActionsDisabled}><Minus className="w-4 h-4" /></Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePickImage(e)}
                />
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
                      readOnly={isReadOnlyEntry}
                      className="w-full min-h-[520px] rounded-md border border-input bg-input-background px-3 py-2 text-sm font-mono leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      placeholder={isReadOnlyEntry ? 'This entry is read-only. Move it to draft to edit.' : 'Write markdown with front matter...'}
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
                <Badge variant="secondary">status: {toStatusLabel(activeStatus)}</Badge>
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

      <Dialog
        open={Boolean(conflictDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setConflictDialog(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Conflict Detected</DialogTitle>
            <DialogDescription>
              Another admin changed this memory on the server. Compare both versions and choose how to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">My Local Edits</p>
              <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-5 whitespace-pre-wrap break-words">
                {conflictDialog?.myDocument || '*Empty*'}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Server Version
                {conflictDialog?.action === 'status' ? ' (updated status by another admin)' : ''}
              </p>
              <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-5 whitespace-pre-wrap break-words">
                {conflictDialog?.serverEntry
                  ? buildDocumentFromEntry(conflictDialog.serverEntry)
                  : 'This entry no longer exists on the server.'}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleKeepMyChangesAfterConflict}>
              Keep My Changes
            </Button>
            <Button onClick={handleReloadServerVersionAfterConflict}>
              Reload Server Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteDialogEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogEntry(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Delete memory "{deleteDialogEntry?.title || ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDeleteEntry();
              }}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
