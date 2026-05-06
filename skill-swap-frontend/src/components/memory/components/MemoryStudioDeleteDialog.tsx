import type { MemoryEntry } from "../../../types/memory";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";

interface MemoryStudioDeleteDialogProps {
  deleteDialogEntry: MemoryEntry | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function MemoryStudioDeleteDialog({
  deleteDialogEntry,
  isSaving,
  onClose,
  onConfirmDelete,
}: MemoryStudioDeleteDialogProps) {
  return (
    <Dialog
      open={Boolean(deleteDialogEntry)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Memory Entry</DialogTitle>
          <DialogDescription>
            Delete memory "{deleteDialogEntry?.title || ""}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmDelete}
            disabled={isSaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
