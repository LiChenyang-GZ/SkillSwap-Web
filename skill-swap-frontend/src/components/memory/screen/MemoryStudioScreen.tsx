import { useCallback, useEffect, useMemo } from "react";
import { useApp } from "../../../contexts/AppContext";
import type { MemoryEntry } from "../../../types/memory";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { MEMORY_EMPTY_DOC } from "../constants/memoryUiConstants";
import { MemoryStudioDeleteDialog } from "../components/MemoryStudioDeleteDialog";
import { MemoryStudioEditorPanel } from "../components/MemoryStudioEditorPanel";
import { MemoryStudioEntriesPanel } from "../components/MemoryStudioEntriesPanel";
import { MemoryStudioHeader } from "../components/MemoryStudioHeader";
import { useMemoryStudioDocumentSync } from "../hooks/useMemoryStudioDocumentSync";
import { useMemoryStudioEditor } from "../hooks/useMemoryStudioEditor";
import { useMemoryStudioLocking } from "../hooks/useMemoryStudioLocking";
import { useMemoryStudioMutations } from "../hooks/useMemoryStudioMutations";
import { useMemoryStudioQuery } from "../hooks/useMemoryStudioQuery";
import { useMemoryStudioSelection } from "../hooks/useMemoryStudioSelection";
import { buildMemoryDocumentFromEntry } from "../utils/memoryDocument";

export function MemoryStudioScreen() {
  const { sessionToken, isAdmin, setCurrentPage, user } = useApp();
  const hasSession = Boolean(sessionToken);
  const currentUserId = user?.id ? String(user.id) : null;

  const query = useMemoryStudioQuery({ hasSession, sessionToken });
  const { entries, setEntries, isLoading, loadEntries } = query;
  const selection = useMemoryStudioSelection({ entries });
  const {
    selectedId,
    setSelectedId,
    selectedEntry,
    isCreatingNew,
    setIsCreatingNew,
    selectedStatus,
    setSelectedStatus,
    entryPage,
    setEntryPage,
    pagedEntries,
    totalEntryPages,
    startCreateNew,
    selectEntry,
    resetSelectionState,
  } = selection;
  const editor = useMemoryStudioEditor({ sessionToken });
  const {
    documentText,
    setDocumentText,
    mode,
    setMode,
    parsedDoc,
    isUploadingImage,
    editorRef,
    fileInputRef,
    insertAroundSelection,
    insertLinePrefix,
    insertStandalone,
    handleEditorPaste,
    handlePickImage,
    resetDocument,
  } = editor;

  const applyEntryPatch = useCallback(
    (nextEntry: MemoryEntry) => {
      setEntries((prev) => prev.map((item) => (item.id === nextEntry.id ? nextEntry : item)));
      if (selectedId === nextEntry.id) {
        setSelectedStatus(nextEntry.status || "draft");
      }
    },
    [selectedId, setEntries, setSelectedStatus]
  );

  const locking = useMemoryStudioLocking({
    sessionToken,
    currentUserId,
    selectedEntry,
    isCreatingNew,
    onPatchEntry: applyEntryPatch,
  });

  const baseDocumentText = useMemo(
    () => (selectedEntry ? buildMemoryDocumentFromEntry(selectedEntry) : MEMORY_EMPTY_DOC),
    [selectedEntry]
  );
  const isDraftContext = !selectedEntry || locking.activeStatus === "draft";
  const hasUnsavedDraftChanges = isDraftContext && documentText !== baseDocumentText;

  useMemoryStudioDocumentSync({
    selectedEntry,
    hasUnsavedDraftChanges,
    setDocumentText,
    setSelectedStatus,
  });

  useEffect(() => {
    if (!hasSession) {
      locking.clearLockState();
      setEntries([]);
      resetSelectionState();
      resetDocument();
    }
  }, [hasSession, locking, resetDocument, resetSelectionState, setEntries]);

  const mutations = useMemoryStudioMutations({
    sessionToken,
    selectedId,
    selectedEntry,
    selectedStatus,
    documentText,
    parsedDoc,
    isLockedByMe: locking.isLockedByMe,
    lockMessage: locking.lockMessage,
    setLockMessage: locking.setLockMessage,
    setEntries,
    setSelectedId,
    setIsCreatingNew,
    setSelectedStatus,
    isEntryDraftLockedByOther: locking.isEntryDraftLockedByOther,
    heldLockEntryIdRef: locking.heldLockEntryIdRef,
    releaseHeldLock: locking.releaseHeldLock,
  });

  const editorActionsDisabled =
    mutations.isSaving ||
    isUploadingImage ||
    locking.isReadOnlyEntry ||
    (locking.isDraftEntry && !locking.isLockedByMe);

  const handleRefresh = async () => {
    setEntryPage(1);
    locking.setLockMessage(null);
    await loadEntries();
  };

  const handleCreateNew = () => {
    startCreateNew();
    resetDocument();
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
            <Button onClick={() => setCurrentPage("memory")}>Back to Memory</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemoryStudioHeader
          isLoading={isLoading}
          onBackToMemory={() => setCurrentPage("memory")}
          onRefresh={() => void handleRefresh()}
          onCreateNew={handleCreateNew}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MemoryStudioEntriesPanel
            entries={entries}
            pagedEntries={pagedEntries}
            selectedId={selectedId}
            isSaving={mutations.isSaving}
            isUploadingImage={isUploadingImage}
            entryPage={entryPage}
            totalEntryPages={totalEntryPages}
            onSelectEntry={selectEntry}
            onChangeStatus={(entry, status) => {
              void mutations.handleStatusForEntry(entry, status);
            }}
            onDeleteEntry={(entry) => mutations.setDeleteDialogEntry(entry)}
            isEntryDraftLockedByOther={locking.isEntryDraftLockedByOther}
            onPrevPage={() => setEntryPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setEntryPage((prev) => Math.min(totalEntryPages, prev + 1))}
          />

          <MemoryStudioEditorPanel
            mode={mode}
            setMode={setMode}
            documentText={documentText}
            parsedBody={parsedDoc.body}
            isSaving={mutations.isSaving}
            isUploadingImage={isUploadingImage}
            isDraftContext={isDraftContext}
            hasUnsavedDraftChanges={hasUnsavedDraftChanges}
            isDraftEntry={locking.isDraftEntry}
            isLockedByMe={locking.isLockedByMe}
            isLockedByOther={locking.isLockedByOther}
            isReadOnlyEntry={locking.isReadOnlyEntry}
            activeStatus={locking.activeStatus}
            lockMessage={locking.lockMessage}
            lockedOwnerName={selectedEntry?.editLockOwnerName}
            editorActionsDisabled={editorActionsDisabled}
            editorRef={editorRef}
            fileInputRef={fileInputRef}
            onSaveDraft={() => {
              setSelectedStatus("draft");
              void mutations.handleSave("draft");
            }}
            onEditorChange={setDocumentText}
            onEditorPaste={handleEditorPaste}
            onPickImage={(event) => {
              void handlePickImage(event);
            }}
            onInsertHeading1={() => insertLinePrefix("# ")}
            onInsertHeading2={() => insertLinePrefix("## ")}
            onInsertBold={() => insertAroundSelection("**", "**", "bold")}
            onInsertItalic={() => insertAroundSelection("*", "*", "italic")}
            onInsertUnderline={() => insertAroundSelection("<u>", "</u>", "underline")}
            onInsertStrike={() => insertAroundSelection("~~", "~~", "strike")}
            onInsertQuote={() => insertLinePrefix("> ")}
            onInsertBulletList={() => insertLinePrefix("- ")}
            onInsertNumberList={() => insertLinePrefix("1. ")}
            onInsertLink={() => insertAroundSelection("[", "](https://)", "link text")}
            onInsertImageLink={() => insertAroundSelection("[", "](https://)", "alt text")}
            onInsertYouTube={() => insertAroundSelection("[", "](https://www.youtube.com/watch?v=)", "Video Title")}
            onInsertInstagram={() => insertAroundSelection("[", "](https://www.instagram.com/reel/)", "Instagram Post")}
            onInsertDivider={() => insertStandalone("\n\n---\n\n")}
          />
        </div>
      </div>

      <MemoryStudioDeleteDialog
        deleteDialogEntry={mutations.deleteDialogEntry}
        isSaving={mutations.isSaving}
        onClose={() => mutations.setDeleteDialogEntry(null)}
        onConfirmDelete={() => {
          void mutations.handleDeleteEntry();
        }}
      />
    </div>
  );
}
