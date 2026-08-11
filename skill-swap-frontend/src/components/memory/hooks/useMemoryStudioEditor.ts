import type { ChangeEvent, ClipboardEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { memoryAdminService } from "../../../shared/service/memory/memoryAdminService";
import type { MemoryEditorMode, MemoryImageWidth } from "../models/memoryFormModel";
import type { MemoryUploadQueueItem } from "../models/memoryActionModel";
import { MEMORY_EMPTY_DOC } from "../constants/memoryUiConstants";
import { parseMemoryDocument } from "../utils/memoryDocument";
import type { MemoryUploadedImage } from "../utils/memoryImage";
import {
  readStoredMemoryImageWidth,
  resolveMemoryImageInsertion,
  storeMemoryImageWidth,
} from "../utils/memoryImage";
import { getMemoryErrorMessage, getMemoryErrorStatus } from "../utils/memoryError";
import {
  IMAGE_UPLOAD_ALLOWED_MIME_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_TOO_LARGE_MESSAGE,
  IMAGE_UPLOAD_UNSUPPORTED_MESSAGE,
} from "../../../shared/constants/uploadLimits";

const MEMORY_IMAGE_UPLOAD_CONCURRENCY = 3;

interface UseMemoryStudioEditorParams {
  getAuthToken: () => Promise<string | null>;
}

export function useMemoryStudioEditor({ getAuthToken }: UseMemoryStudioEditorParams) {
  const [documentText, setDocumentText] = useState<string>(MEMORY_EMPTY_DOC);
  const [mode, setMode] = useState<MemoryEditorMode>("split");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bodyImageWidth, setBodyImageWidthState] = useState<MemoryImageWidth>(readStoredMemoryImageWidth);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<MemoryUploadQueueItem[]>([]);
  const uploadQueueRunningRef = useRef(false);
  // Insertion happens after an await, so the queue reads the width from a ref to pick up
  // a change made while the upload was still in flight.
  const bodyImageWidthRef = useRef<MemoryImageWidth>(bodyImageWidth);

  const setBodyImageWidth = useCallback((width: MemoryImageWidth) => {
    bodyImageWidthRef.current = width;
    setBodyImageWidthState(width);
    storeMemoryImageWidth(width);
  }, []);

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

  const validateImageFile = (file: File): boolean => {
    const contentType = String(file.type || "").toLowerCase();
    if (!IMAGE_UPLOAD_ALLOWED_MIME_TYPES.has(contentType)) {
      toast.error(IMAGE_UPLOAD_UNSUPPORTED_MESSAGE);
      return false;
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      toast.error(IMAGE_UPLOAD_TOO_LARGE_MESSAGE);
      return false;
    }
    return true;
  };

  const uploadImageAsset = async (file: File, token: string): Promise<MemoryUploadedImage | null> => {
    try {
      const result = await memoryAdminService.uploadMediaByAdmin(file, token);
      const fallbackAlt = file.name ? file.name.replace(/\.[^.]+$/, "") : "image";
      return { url: result.url || result.path, alt: fallbackAlt || "image" };
    } catch (error) {
      console.error(error);
      const status = getMemoryErrorStatus(error);
      const message = getMemoryErrorMessage(error) || "";
      const isSizeLimitError =
        status === 413 ||
        /payload too large|image is too large|maximum upload size|size exceeds|too large/i.test(message);

      if (isSizeLimitError) {
        toast.error(IMAGE_UPLOAD_TOO_LARGE_MESSAGE);
        return null;
      }

      toast.error(message || "Failed to upload image.");
    }
    return null;
  };

  const uploadBatchWithLimit = async (batch: MemoryUploadQueueItem[], token: string) => {
    const uploadedItems: Array<MemoryUploadQueueItem & { image: MemoryUploadedImage | null }> = batch.map((item) => ({
      ...item,
      image: null,
    }));
    const workerCount = Math.min(MEMORY_IMAGE_UPLOAD_CONCURRENCY, batch.length);

    const uploadWorker = async (index: number): Promise<void> => {
      if (index >= batch.length) {
        return;
      }

      uploadedItems[index] = {
        ...batch[index],
        image: await uploadImageAsset(batch[index].file, token),
      };
      await uploadWorker(index + workerCount);
    };

    await Promise.all(
      Array.from({ length: workerCount }, (_, index) => uploadWorker(index))
    );

    return uploadedItems;
  };

  const insertUploadedImages = (uploadedItems: Array<MemoryUploadQueueItem & { image: MemoryUploadedImage | null }>) => {
    const editor = editorRef.current;
    if (!editor) return;

    let nextText = editor.value;
    let selectionStart = editor.selectionStart;
    let selectionEnd = editor.selectionEnd;
    let explicitRangeOffset = 0;
    let insertedCount = 0;

    uploadedItems.forEach((item) => {
      if (!item.image) {
        return;
      }

      const rangeStart = item.start;
      const rangeEnd = item.end;
      const hasExplicitRange = typeof rangeStart === "number" && typeof rangeEnd === "number";
      const caretStart = hasExplicitRange
        ? Math.min(Math.max(0, rangeStart + explicitRangeOffset), nextText.length)
        : selectionStart;
      const caretEnd = hasExplicitRange
        ? Math.min(Math.max(caretStart, rangeEnd + explicitRangeOffset), nextText.length)
        : selectionEnd;

      // Resolved against the text as it stands now, so each image in a batch sees the
      // ranges the ones before it already shifted.
      const insertion = resolveMemoryImageInsertion(
        nextText,
        caretStart,
        caretEnd,
        item.image,
        bodyImageWidthRef.current
      );

      nextText = `${nextText.slice(0, insertion.start)}${insertion.snippet}${nextText.slice(insertion.end)}`;
      selectionStart = insertion.start + insertion.snippet.length;
      selectionEnd = selectionStart;
      insertedCount += 1;

      if (hasExplicitRange) {
        explicitRangeOffset += insertion.snippet.length - (insertion.end - insertion.start);
      }
    });

    if (insertedCount === 0) {
      return;
    }

    updateSelection(nextText, selectionStart, selectionEnd);
    toast.success(insertedCount === 1 ? "Image uploaded and inserted." : `${insertedCount} images uploaded and inserted.`);
  };

  const processUploadBatch = async (): Promise<void> => {
    const batch = uploadQueueRef.current.splice(0);
    if (batch.length === 0) {
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      toast.error("Please sign in.");
      uploadQueueRef.current = [];
      return;
    }

    const uploadedItems = await uploadBatchWithLimit(batch, token);

    insertUploadedImages(uploadedItems);

    if (uploadQueueRef.current.length > 0) {
      await processUploadBatch();
    }
  };

  const runUploadQueue = async () => {
    if (uploadQueueRunningRef.current) {
      return;
    }

    uploadQueueRunningRef.current = true;
    setIsUploadingImage(true);
    try {
      await processUploadBatch();
    } finally {
      uploadQueueRunningRef.current = false;
      if (uploadQueueRef.current.length > 0) {
        void runUploadQueue();
      } else {
        setIsUploadingImage(false);
      }
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
    if (!validateImageFile(file)) {
      return;
    }
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
    if (!validateImageFile(file)) {
      return;
    }
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
    bodyImageWidth,
    setBodyImageWidth,
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
