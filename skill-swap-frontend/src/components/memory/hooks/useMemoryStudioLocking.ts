import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { MemoryEntry } from "../../../types/memory";
import { memoryAdminService } from "../../../shared/service/memory/memoryAdminService";
import { MEMORY_LOCK_HEARTBEAT_MS } from "../constants/memoryUiConstants";
import { getMemoryErrorMessage, getMemoryErrorStatus } from "../utils/memoryError";
import { isMemoryDraftLockedByOther } from "../utils/memoryStatusLabels";

interface UseMemoryStudioLockingParams {
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  currentUserId: string | null;
  selectedEntry: MemoryEntry | null;
  isCreatingNew: boolean;
  onPatchEntry: (entry: MemoryEntry) => void;
}

export function useMemoryStudioLocking({
  isAuthenticated,
  getAuthToken,
  currentUserId,
  selectedEntry,
  isCreatingNew,
  onPatchEntry,
}: UseMemoryStudioLockingParams) {
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const lockHeartbeatRef = useRef<number | null>(null);
  const heldLockEntryIdRef = useRef<string | null>(null);
  const selectedEntryId = selectedEntry?.id || null;
  const selectedEntryStatus = selectedEntry?.status || null;

  const activeStatus: MemoryEntry["status"] = selectedEntry?.status || "draft";
  const isDraftEntry = Boolean(selectedEntry && activeStatus === "draft");
  const lockedByUserId = selectedEntry?.editLockOwnerId ? String(selectedEntry.editLockOwnerId) : null;
  const isLockedByMe = Boolean(isDraftEntry && lockedByUserId && currentUserId && lockedByUserId === currentUserId);
  const isLockedByOther = Boolean(isDraftEntry && lockedByUserId && currentUserId && lockedByUserId !== currentUserId);
  const isReadOnlyEntry = Boolean(selectedEntry && activeStatus !== "draft");

  const releaseHeldLock = useCallback(
    async (entryId: string, silent = true) => {
      const token = await getAuthToken();
      if (!token) return;
      try {
        await memoryAdminService.releaseLockByAdmin(entryId, token);
      } catch (error) {
        if (!silent) {
          const msg = getMemoryErrorMessage(error) || "Failed to release edit lock.";
          toast.error(msg);
        }
      }
    },
    [getAuthToken]
  );

  const acquireLockForEntry = useCallback(
    async (entryId: string, silent = false): Promise<MemoryEntry | null> => {
      if (!currentUserId) {
        return null;
      }

      const token = await getAuthToken();
      if (!token) {
        return null;
      }

      try {
        const lockedEntry = await memoryAdminService.acquireLockByAdmin(entryId, token);
        onPatchEntry(lockedEntry);

        if (lockedEntry.editLockOwnerId && String(lockedEntry.editLockOwnerId) === currentUserId) {
          heldLockEntryIdRef.current = entryId;
          setLockMessage(null);
        } else if (lockedEntry.editLockOwnerId) {
          const owner = lockedEntry.editLockOwnerName || "another admin";
          setLockMessage(`This entry is currently locked by ${owner}.`);
        }

        return lockedEntry;
      } catch (error) {
        const status = getMemoryErrorStatus(error);
        const message = getMemoryErrorMessage(error) || "Failed to acquire edit lock.";

        if (status === 423) {
          setLockMessage(message);
          if (!silent) {
            toast.info(message);
          }
        } else if (!silent) {
          toast.error(message);
        }

        return null;
      }
    },
    [currentUserId, onPatchEntry, getAuthToken]
  );

  useEffect(() => {
    const shouldManageLock = Boolean(
      isAuthenticated &&
        currentUserId &&
        selectedEntryId &&
        !isCreatingNew &&
        selectedEntryStatus === "draft"
    );

    if (!shouldManageLock || !selectedEntryId) {
      if (lockHeartbeatRef.current !== null) {
        window.clearInterval(lockHeartbeatRef.current);
        lockHeartbeatRef.current = null;
      }
      return;
    }

    let disposed = false;

    const syncLock = async (silent: boolean) => {
      const locked = await acquireLockForEntry(selectedEntryId, silent);
      if (disposed || !locked) {
        return;
      }
      if (locked.editLockOwnerId && String(locked.editLockOwnerId) !== currentUserId) {
        const owner = locked.editLockOwnerName || "another admin";
        setLockMessage(`This entry is currently locked by ${owner}.`);
      } else {
        setLockMessage(null);
      }
    };

    void syncLock(false);
    lockHeartbeatRef.current = window.setInterval(() => {
      void syncLock(true);
    }, MEMORY_LOCK_HEARTBEAT_MS);

    return () => {
      disposed = true;

      if (lockHeartbeatRef.current !== null) {
        window.clearInterval(lockHeartbeatRef.current);
        lockHeartbeatRef.current = null;
      }

      if (heldLockEntryIdRef.current === selectedEntryId) {
        heldLockEntryIdRef.current = null;
        void releaseHeldLock(selectedEntryId, true);
      }
    };
  }, [
    acquireLockForEntry,
    currentUserId,
    isCreatingNew,
    releaseHeldLock,
    selectedEntryId,
    selectedEntryStatus,
    isAuthenticated,
  ]);

  const isEntryDraftLockedByOther = useCallback(
    (entry: MemoryEntry) => isMemoryDraftLockedByOther(entry, currentUserId),
    [currentUserId]
  );

  const clearLockState = useCallback(() => {
    if (lockHeartbeatRef.current !== null) {
      window.clearInterval(lockHeartbeatRef.current);
      lockHeartbeatRef.current = null;
    }
    heldLockEntryIdRef.current = null;
    setLockMessage(null);
  }, []);

  const lockComputed = useMemo(
    () => ({
      activeStatus,
      isDraftEntry,
      isLockedByMe,
      isLockedByOther,
      isReadOnlyEntry,
    }),
    [activeStatus, isDraftEntry, isLockedByMe, isLockedByOther, isReadOnlyEntry]
  );

  return {
    lockMessage,
    setLockMessage,
    heldLockEntryIdRef,
    releaseHeldLock,
    isEntryDraftLockedByOther,
    clearLockState,
    ...lockComputed,
  };
}
