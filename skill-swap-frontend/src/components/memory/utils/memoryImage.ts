import type { MemoryImageWidth } from "../models/memoryFormModel";
import {
  MEMORY_IMAGE_WIDTH_DEFAULT,
  MEMORY_IMAGE_WIDTH_STORAGE_KEY,
  isMemoryImageWidth,
} from "../constants/memoryUiConstants";

export interface MemoryUploadedImage {
  url: string;
  alt: string;
}

export interface MemoryImageInsertion {
  start: number;
  end: number;
  snippet: string;
}

// Mirrors the front matter shape parsed in `memoryDocument.ts`, but keeps offsets
// against the raw text so the caret can be located inside it.
const FRONT_MATTER_PATTERN = /^\uFEFF?(?:[ \t\r]*\n)*---[ \t\r]*\n[\s\S]*?\n---[ \t\r]*(?:\n|$)/;
const COVER_KEY_PATTERN = /^[ \t]*(cover|coverUrl|image|imageUrl)[ \t]*:/i;

// Only quotes and angle brackets need escaping here: `&` is left alone so the URL
// written into the source stays byte-identical to the one `extractMemoryMediaUrls` reads back.
function escapeHtmlAttribute(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function findFrontMatterEnd(documentText: string): number | null {
  const match = documentText.match(FRONT_MATTER_PATTERN);
  return match ? match[0].length : null;
}

function getLineRange(text: string, offset: number): { start: number; end: number } {
  const start = text.lastIndexOf("\n", offset - 1) + 1;
  const newline = text.indexOf("\n", offset);
  let end = newline === -1 ? text.length : newline;
  if (end > start && text[end - 1] === "\r") {
    end -= 1;
  }
  return { start, end };
}

function matchCoverValueRange(documentText: string, line: { start: number; end: number }) {
  const coverKey = documentText.slice(line.start, line.end).match(COVER_KEY_PATTERN);
  // Range covers the value only, so re-pasting swaps the cover instead of appending to it.
  return coverKey ? { start: line.start + coverKey[0].length, end: line.end } : null;
}

// The caret's own line wins; otherwise any cover key in the block does. Dropping a bare URL
// wherever the caret happened to sit would corrupt the `---` delimiters or the title.
function findFrontMatterCoverValueRange(documentText: string, frontMatterEnd: number, caret: number) {
  const fromCaretLine = matchCoverValueRange(documentText, getLineRange(documentText, caret));
  if (fromCaretLine) {
    return fromCaretLine;
  }

  let lineStart = 0;
  while (lineStart < frontMatterEnd) {
    const line = getLineRange(documentText, lineStart);
    const match = matchCoverValueRange(documentText, line);
    if (match) {
      return match;
    }

    const nextNewline = documentText.indexOf("\n", line.end);
    if (nextNewline === -1) {
      break;
    }
    lineStart = nextNewline + 1;
  }

  return null;
}

// Block-level HTML needs a blank line around it, otherwise markdown folds it into
// the surrounding paragraph (and back-to-back pastes end up on a single line).
function padAsBlock(documentText: string, start: number, end: number, snippet: string): string {
  const before = documentText.slice(0, start);
  const after = documentText.slice(end);

  const prefix = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = after.length === 0 || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

  return `${prefix}${snippet}${suffix}`;
}

export function buildMemoryBodyImageHtml(image: MemoryUploadedImage, width: MemoryImageWidth): string {
  return [
    '<div align="center">',
    `  <img src="${escapeHtmlAttribute(image.url)}" alt="${escapeHtmlAttribute(image.alt)}" width="${width}" />`,
    "</div>",
  ].join("\n");
}

/**
 * Decides what an uploaded image should look like at the caret, and which range it replaces.
 *
 * Front matter takes a bare URL (a multi-line HTML block there would break the YAML and the
 * cover would silently stop resolving); the body takes a sized HTML block.
 */
export function resolveMemoryImageInsertion(
  documentText: string,
  selectionStart: number,
  selectionEnd: number,
  image: MemoryUploadedImage,
  bodyWidth: MemoryImageWidth
): MemoryImageInsertion {
  const frontMatterEnd = findFrontMatterEnd(documentText);

  if (frontMatterEnd !== null && selectionStart < frontMatterEnd) {
    const coverValue = findFrontMatterCoverValueRange(documentText, frontMatterEnd, selectionStart);
    if (coverValue) {
      return { ...coverValue, snippet: ` ${image.url}` };
    }

    return { start: selectionStart, end: selectionEnd, snippet: image.url };
  }

  return {
    start: selectionStart,
    end: selectionEnd,
    snippet: padAsBlock(documentText, selectionStart, selectionEnd, buildMemoryBodyImageHtml(image, bodyWidth)),
  };
}

export function readStoredMemoryImageWidth(): MemoryImageWidth {
  try {
    const stored = window.localStorage.getItem(MEMORY_IMAGE_WIDTH_STORAGE_KEY);
    return stored && isMemoryImageWidth(stored) ? stored : MEMORY_IMAGE_WIDTH_DEFAULT;
  } catch {
    return MEMORY_IMAGE_WIDTH_DEFAULT;
  }
}

export function storeMemoryImageWidth(width: MemoryImageWidth): void {
  try {
    window.localStorage.setItem(MEMORY_IMAGE_WIDTH_STORAGE_KEY, width);
  } catch {
    // Preference is a convenience only; a blocked storage quota must not break uploads.
  }
}
