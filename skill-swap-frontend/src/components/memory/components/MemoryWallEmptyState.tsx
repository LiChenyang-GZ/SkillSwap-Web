import { Archive } from "lucide-react";
import { Button } from "../../ui/button";
import { MEMORY_EMPTY_ACTION_LABEL, MEMORY_EMPTY_DESCRIPTION, MEMORY_EMPTY_TITLE } from "../constants/memoryMessages";

interface MemoryWallEmptyStateProps {
  onExplore: () => void;
}

export function MemoryWallEmptyState({ onExplore }: MemoryWallEmptyStateProps) {
  return (
    <div className="max-w-md mx-auto text-center px-4">
      <div className="bg-muted/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
        <Archive className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-bold mb-3">{MEMORY_EMPTY_TITLE}</h3>
      <p className="text-muted-foreground mb-8">{MEMORY_EMPTY_DESCRIPTION}</p>
      <Button onClick={onExplore} size="lg" className="rounded-full">
        {MEMORY_EMPTY_ACTION_LABEL}
      </Button>
    </div>
  );
}
