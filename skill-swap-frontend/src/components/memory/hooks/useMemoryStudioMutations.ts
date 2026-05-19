import { useState } from "react";
import { toast } from "sonner";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { memoryAdminService } from "../../../shared/service/memory/memoryAdminService";
import {
  MEMORY_STUDIO_DELETE_FAILED,
  MEMORY_STUDIO_SAVE_FAILED,
  MEMORY_STUDIO_SLUG_EXISTS_FAILED,
  MEMORY_STUDIO_STATUS_FAILED,
} from "../constants/memoryMessages";
import type { ParsedMemoryDocument } from "../models/memoryFormModel";
import { getMemoryErrorMessage, getMemoryErrorStatus } from "../utils/memoryError";
import { toMemoryStatusLabel } from "../utils/memoryStatusLabels";

interface UseMemoryStudioMutationsParams {
  getAuthToken: () => Promise<string | null>;
  selectedId: string | null;
  selectedEntry: MemoryEntry | null;
  selectedStatus: MemoryEntry["status"];
  documentText: string;
  parsedDoc: ParsedMemoryDocument;
  isLockedByMe: boolean;
  lockMessage: string | null;
  setLockMessage: (message: string | null) => void;
  setEntries: Dispatch<SetStateAction<MemoryEntry[]>>;
  setSelectedId: (id: string | null) => void;
  setIsCreatingNew: (value: boolean) => void;
  setSelectedStatus: (status: MemoryEntry["status"]) => void;
  isEntryDraftLockedByOther: (entry: MemoryEntry) => boolean;
  heldLockEntryIdRef: MutableRefObject<string | null>;
  releaseHeldLock: (entryId: string, silent?: boolean) => Promise<void>;
}

export function useMemoryStudioMutations({
  getAuthToken,
  selectedId,
  selectedEntry,
  selectedStatus,
  documentText,
  parsedDoc,
  isLockedByMe,
  lockMessage,
  setLockMessage,
  setEntries,
  setSelectedId,
  setIsCreatingNew,
  setSelectedStatus,
  isEntryDraftLockedByOther,
  heldLockEntryIdRef,
  releaseHeldLock,
}: UseMemoryStudioMutationsParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogEntry, setDeleteDialogEntry] = useState<MemoryEntry | null>(null);

  const handleSave = async (forcedStatus?: MemoryEntry["status"]) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error("Please sign in.");
      return;
    }

    if (!parsedDoc.title) {
      toast.error("Please provide a card title in front matter: title: ...");
      return;
    }

    if (selectedEntry && selectedEntry.status === "draft" && !isLockedByMe) {
      toast.info(lockMessage || "This draft is locked by another admin.");
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
        const updated = await memoryAdminService.updateByAdmin(selectedId, payload, token);
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setIsCreatingNew(false);
        setSelectedStatus(updated.status || statusToPersist);

        if ((updated.status || statusToPersist) !== "draft" && heldLockEntryIdRef.current === selectedId) {
          heldLockEntryIdRef.current = null;
          void releaseHeldLock(selectedId, true);
        }

        toast.success("Saved.");
      } else {
        const created = await memoryAdminService.createByAdmin(payload, token);
        setEntries((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setIsCreatingNew(false);
        setSelectedStatus(created.status || statusToPersist);
        toast.success("Saved.");
      }
    } catch (error) {
      console.error(error);
      const status = getMemoryErrorStatus(error);
      const message = getMemoryErrorMessage(error) || "";
      if (status === 400 && /slug already exists/i.test(message)) {
        toast.error(MEMORY_STUDIO_SLUG_EXISTS_FAILED);
        return;
      }
      if (status === 423) {
        const msg = message || "This draft is currently locked by another admin.";
        setLockMessage(msg);
        toast.info(msg);
        return;
      }
      toast.error(MEMORY_STUDIO_SAVE_FAILED);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteDialogEntry) return;

    const token = await getAuthToken();
    if (!token) {
      toast.error("Please sign in.");
      return;
    }

    if (deleteDialogEntry.status === "draft" && isEntryDraftLockedByOther(deleteDialogEntry)) {
      const owner = deleteDialogEntry.editLockOwnerName || "another admin";
      toast.info(`Cannot delete: this draft is currently locked by ${owner}.`);
      return;
    }

    setIsSaving(true);
    try {
      await memoryAdminService.deleteByAdmin(deleteDialogEntry.id, token);
      if (heldLockEntryIdRef.current === deleteDialogEntry.id) {
        heldLockEntryIdRef.current = null;
      }
      setEntries((prev) => prev.filter((item) => item.id !== deleteDialogEntry.id));
      setDeleteDialogEntry(null);
      toast.success("Deleted.");
    } catch (error) {
      console.error(error);
      const status = getMemoryErrorStatus(error);
      if (status === 423) {
        const msg = getMemoryErrorMessage(error) || "This memory is currently locked. Re-open it to acquire the edit lock.";
        setLockMessage(msg);
        toast.info(msg);
        return;
      }
      toast.error(MEMORY_STUDIO_DELETE_FAILED);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusForEntry = async (entry: MemoryEntry, nextStatus: MemoryEntry["status"]) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error("Please sign in.");
      return;
    }

    if (entry.status === "draft" && isEntryDraftLockedByOther(entry)) {
      const owner = entry.editLockOwnerName || "another admin";
      toast.info(`Cannot change status while ${owner} is editing this draft.`);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await memoryAdminService.updateByAdmin(entry.id, { status: nextStatus }, token);
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedId === entry.id) {
        setSelectedStatus(updated.status || nextStatus);
      }
      toast.success(`Memory ${toMemoryStatusLabel(updated.status || nextStatus)}.`);
    } catch (error) {
      console.error(error);
      const status = getMemoryErrorStatus(error);
      if (status === 423) {
        const msg = getMemoryErrorMessage(error) || "This draft is currently locked by another admin.";
        setLockMessage(msg);
        toast.info(msg);
        return;
      }
      toast.error(MEMORY_STUDIO_STATUS_FAILED);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    deleteDialogEntry,
    setDeleteDialogEntry,
    handleSave,
    handleDeleteEntry,
    handleStatusForEntry,
  };
}
