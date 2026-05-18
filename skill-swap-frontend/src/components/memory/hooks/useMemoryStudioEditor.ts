import type { ChangeEvent, ClipboardEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { memoryAdminService } from "../../../shared/service/memory/memoryAdminService";
import type { MemoryEditorMode } from "../models/memoryFormModel";
import type { MemoryUploadQueueItem } from "../models/memoryActionModel";
import { MEMORY_EMPTY_DOC } from "../constants/memoryUiConstants";
import { parseMemoryDocument } from "../utils/memoryDocument";
import { getMemoryErrorMessage, getMemoryErrorStatus } from "../utils/memoryError";
import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_TOO_LARGE_MESSAGE } from "../../../shared/constants/uploadLimits";

interface UseMemoryStudioEditorParams {
  getAuthToken: () => Promise<string | null>;
}

export function useMemoryStudioEditor({ getAuthToken }: UseMemoryStudioEditorParams) {
  const [documentText, setDocumentText] = useState<string>(MEMORY_EMPTY_DOC);
  const [mode, setMode] = useState<MemoryEditorMode>("split");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<MemoryUploadQueueItem[]>([]);
  const uploadQueueRunningRef = useRef(false);

  const parsedDoc = useMemo(() => parseMemoryDocument(documentText), [documentText]);

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
    const lineStart = documentText.lastIndexOf("\n", start - 1) + 1;
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
    const token = await getAuthToken();
    if (!token) {
      toast.error("Please sign in.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.");
      return;
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      toast.error(IMAGE_UPLOAD_TOO_LARGE_MESSAGE);
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await memoryAdminService.uploadMediaByAdmin(file, token);
      const fallbackAlt = file.name ? file.name.replace(/\.[^.]+$/, "") : "image";
      const markdown = `<div align="center">\n  <img src="${result.url || result.path}" alt="${fallbackAlt || "image"}" width="250" />\n</div>`;
      insertTextAtRange(markdown, start, end);
      toast.success("Image uploaded and inserted.");
    } catch (error) {
      console.error(error);
      const status = getMemoryErrorStatus(error);
      const message = getMemoryErrorMessage(error) || "";
      const isSizeLimitError =
        status === 413 ||
        /payload too large|image is too large|maximum upload size|size exceeds|too large/i.test(message);

      if (isSizeLimitError) {
        toast.error(IMAGE_UPLOAD_TOO_LARGE_MESSAGE);
        return;
      }

      toast.error(message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const runUploadQueue = async () => {
    if (uploadQueueRunningRef.current) {
      return;
    }

    uploadQueueRunningRef.current = true;
    try {
      while (uploadQueueRef.current.length > 0) {
        const next = uploadQueueRef.current.shift();
        if (!next) {
          continue;
        }
        await uploadAndInsertImage(next.file, next.start, next.end);
      }
    } finally {
      uploadQueueRunningRef.current = false;
    }
  };

  const enqueueImageUpload = (file: File, start?: number, end?: number) => {
    uploadQueueRef.current.push({ file, start, end });
    void runUploadQueue();
  };

  const handleEditorPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
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
    if (isUploadingImage || uploadQueueRunningRef.current) {
      enqueueImageUpload(file);
      toast.info("Image added to upload queue.");
      return;
    }
    enqueueImageUpload(file, start, end);
  };

  const handlePickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (isUploadingImage || uploadQueueRunningRef.current) {
      enqueueImageUpload(file);
      toast.info("Image added to upload queue.");
      return;
    }
    enqueueImageUpload(file);
  };

  const resetDocument = useCallback(() => {
    setDocumentText(MEMORY_EMPTY_DOC);
  }, []);

  return {
    documentText,
    setDocumentText,
    mode,
    setMode,
    parsedDoc,
    isUploadingImage,
    editorRef,
    fileInputRef,
    uploadQueueRunningRef,
    insertAroundSelection,
    insertLinePrefix,
    insertStandalone,
    handleEditorPaste,
    handlePickImage,
    resetDocument,
  };
}
