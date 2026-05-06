import type { ChangeEvent, ClipboardEvent, RefObject } from "react";
import {
  Bold,
  Eye,
  FilePenLine,
  Heading1,
  Heading2,
  Image,
  Instagram,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Save,
  Split,
  Strikethrough,
  Underline,
  Upload,
  Video,
} from "lucide-react";
import type { MemoryEntry } from "../../../types/memory";
import type { MemoryEditorMode } from "../models/memoryFormModel";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { MemoryMarkdownRenderer } from "./MemoryMarkdownRenderer";
import { toMemoryStatusLabel } from "../utils/memoryStatusLabels";

interface MemoryStudioEditorPanelProps {
  mode: MemoryEditorMode;
  setMode: (mode: MemoryEditorMode) => void;
  documentText: string;
  parsedBody: string;
  isSaving: boolean;
  isUploadingImage: boolean;
  isDraftContext: boolean;
  hasUnsavedDraftChanges: boolean;
  isDraftEntry: boolean;
  isLockedByMe: boolean;
  isLockedByOther: boolean;
  isReadOnlyEntry: boolean;
  activeStatus: MemoryEntry["status"];
  lockMessage: string | null;
  lockedOwnerName?: string;
  editorActionsDisabled: boolean;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSaveDraft: () => void;
  onEditorChange: (value: string) => void;
  onEditorPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onPickImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onInsertHeading1: () => void;
  onInsertHeading2: () => void;
  onInsertBold: () => void;
  onInsertItalic: () => void;
  onInsertUnderline: () => void;
  onInsertStrike: () => void;
  onInsertQuote: () => void;
  onInsertBulletList: () => void;
  onInsertNumberList: () => void;
  onInsertLink: () => void;
  onInsertImageLink: () => void;
  onInsertYouTube: () => void;
  onInsertInstagram: () => void;
  onInsertDivider: () => void;
}

export function MemoryStudioEditorPanel({
  mode,
  setMode,
  documentText,
  parsedBody,
  isSaving,
  isUploadingImage,
  isDraftContext,
  hasUnsavedDraftChanges,
  isDraftEntry,
  isLockedByMe,
  isLockedByOther,
  isReadOnlyEntry,
  activeStatus,
  lockMessage,
  lockedOwnerName,
  editorActionsDisabled,
  editorRef,
  fileInputRef,
  onSaveDraft,
  onEditorChange,
  onEditorPaste,
  onPickImage,
  onInsertHeading1,
  onInsertHeading2,
  onInsertBold,
  onInsertItalic,
  onInsertUnderline,
  onInsertStrike,
  onInsertQuote,
  onInsertBulletList,
  onInsertNumberList,
  onInsertLink,
  onInsertImageLink,
  onInsertYouTube,
  onInsertInstagram,
  onInsertDivider,
}: MemoryStudioEditorPanelProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">Markdown Editor</CardTitle>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isDraftContext && (
              <Button
                variant={hasUnsavedDraftChanges ? "default" : "outline"}
                size="sm"
                onClick={onSaveDraft}
                disabled={isSaving || isUploadingImage || !hasUnsavedDraftChanges || (isDraftEntry && !isLockedByMe)}
                className={hasUnsavedDraftChanges ? "" : "bg-transparent"}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Draft
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={mode === "write" ? "bg-muted text-foreground border-border" : ""}
              onClick={() => setMode("write")}
            >
              <FilePenLine className="w-4 h-4 mr-1" />
              Write
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={mode === "preview" ? "bg-muted text-foreground border-border" : ""}
              onClick={() => setMode("preview")}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={mode === "split" ? "bg-muted text-foreground border-border" : ""}
              onClick={() => setMode("split")}
            >
              <Split className="w-4 h-4 mr-1" />
              Split
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDraftEntry && isLockedByOther && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>{lockMessage || `This draft is currently locked by ${lockedOwnerName || "another admin"}.`}</p>
          </div>
        )}

        {isDraftEntry && isLockedByMe && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p>You hold the edit lock for this draft. Other admins can view but cannot edit until you leave this entry.</p>
          </div>
        )}

        {isReadOnlyEntry && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>
              This memory is <span className="font-medium">{toMemoryStatusLabel(activeStatus)}</span> and read-only.
              Move it to <span className="font-medium">draft</span> from the entry menu to continue editing content.
            </p>
          </div>
        )}

        <div className="rounded-md border border-border p-2 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onInsertHeading1} disabled={editorActionsDisabled}>
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertHeading2} disabled={editorActionsDisabled}>
            <Heading2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertBold} disabled={editorActionsDisabled}>
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertItalic} disabled={editorActionsDisabled}>
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertUnderline} disabled={editorActionsDisabled}>
            <Underline className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertStrike} disabled={editorActionsDisabled}>
            <Strikethrough className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertQuote} disabled={editorActionsDisabled}>
            <Quote className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertBulletList} disabled={editorActionsDisabled}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertNumberList} disabled={editorActionsDisabled}>
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertLink} disabled={editorActionsDisabled}>
            <Link2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertImageLink} disabled={editorActionsDisabled}>
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertYouTube} title="Insert YouTube Video" disabled={editorActionsDisabled}>
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertInstagram} title="Insert Instagram Post" disabled={editorActionsDisabled}>
            <Instagram className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={editorActionsDisabled}
            title="Upload image"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onInsertDivider} disabled={editorActionsDisabled}>
            <Minus className="w-4 h-4" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickImage(e)} />
        </div>

        <div className={`grid gap-4 ${mode === "split" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
          {(mode === "write" || mode === "split") && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Write</div>
              <textarea
                ref={editorRef}
                value={documentText}
                onChange={(e) => onEditorChange(e.target.value)}
                onPaste={onEditorPaste}
                readOnly={isReadOnlyEntry}
                className="w-full min-h-[520px] rounded-md border border-border bg-input px-3 py-2 text-sm font-mono leading-6 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder={isReadOnlyEntry ? "This entry is read-only. Move it to draft to edit." : "Write markdown with front matter..."}
              />
            </div>
          )}

          {(mode === "preview" || mode === "split") && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Preview</div>
              <MemoryMarkdownRenderer
                content={parsedBody}
                fallbackMarkdown="*Empty content*"
                imageClassName="w-full rounded-lg border border-border/60"
                wrapperClassName="markdown-preview min-h-[520px] rounded-md border border-border bg-card px-4 py-4 overflow-auto max-w-none"
                embedClassName="my-4"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
