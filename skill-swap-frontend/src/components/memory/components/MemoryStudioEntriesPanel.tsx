import {
  ArchiveRestore,
  EyeOff,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import type { MemoryEntry } from "../../../types/memory";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { toMemoryStatusLabel } from "../utils/memoryStatusLabels";
import { MEMORY_ENTRY_PAGE_SIZE } from "../constants/memoryUiConstants";

interface MemoryStudioEntriesPanelProps {
  entries: MemoryEntry[];
  pagedEntries: MemoryEntry[];
  selectedId: string | null;
  isSaving: boolean;
  isUploadingImage: boolean;
  entryPage: number;
  totalEntryPages: number;
  onSelectEntry: (entryId: string) => void;
  onChangeStatus: (entry: MemoryEntry, status: MemoryEntry["status"]) => void;
  onDeleteEntry: (entry: MemoryEntry) => void;
  isEntryDraftLockedByOther: (entry: MemoryEntry) => boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function MemoryStudioEntriesPanel({
  entries,
  pagedEntries,
  selectedId,
  isSaving,
  isUploadingImage,
  entryPage,
  totalEntryPages,
  onSelectEntry,
  onChangeStatus,
  onDeleteEntry,
  isEntryDraftLockedByOther,
  onPrevPage,
  onNextPage,
}: MemoryStudioEntriesPanelProps) {
  return (
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
                entry.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button className="text-left flex-1 min-w-0" onClick={() => onSelectEntry(entry.id)}>
                  <div className="font-medium line-clamp-1">{entry.title}</div>
                  {isEntryDraftLockedByOther(entry) && (
                    <div className="text-xs text-amber-600 mt-1 line-clamp-1">
                      Locked by {entry.editLockOwnerName || "another admin"}
                    </div>
                  )}
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="capitalize">
                    {toMemoryStatusLabel(entry.status)}
                  </Badge>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label="More actions"
                        onClick={() => onSelectEntry(entry.id)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" alignOffset={-8} sideOffset={8} className="w-48">
                      {entry.status === "draft" && (
                        <DropdownMenuItem
                          onSelect={() => onChangeStatus(entry, "published")}
                          disabled={isSaving || isUploadingImage || isEntryDraftLockedByOther(entry)}
                        >
                          <Send className="w-4 h-4" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {entry.status === "published" && (
                        <DropdownMenuItem
                          onSelect={() => onChangeStatus(entry, "archived")}
                          disabled={isSaving || isUploadingImage || isEntryDraftLockedByOther(entry)}
                        >
                          <EyeOff className="w-4 h-4" />
                          Hide (Archive)
                        </DropdownMenuItem>
                      )}
                      {entry.status === "published" && (
                        <DropdownMenuItem
                          onSelect={() => onChangeStatus(entry, "draft")}
                          disabled={isSaving || isUploadingImage || isEntryDraftLockedByOther(entry)}
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Move to Draft
                        </DropdownMenuItem>
                      )}
                      {entry.status === "archived" && (
                        <DropdownMenuItem
                          onSelect={() => onChangeStatus(entry, "draft")}
                          disabled={isSaving || isUploadingImage || isEntryDraftLockedByOther(entry)}
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Move to Draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDeleteEntry(entry)}
                        disabled={isSaving || isUploadingImage || isEntryDraftLockedByOther(entry)}
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

        {entries.length > MEMORY_ENTRY_PAGE_SIZE && (
          <div className="pt-2 flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" onClick={onPrevPage} disabled={entryPage <= 1}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {entryPage} / {totalEntryPages}
            </span>
            <Button size="sm" variant="outline" onClick={onNextPage} disabled={entryPage >= totalEntryPages}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
