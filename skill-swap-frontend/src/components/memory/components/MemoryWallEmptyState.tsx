import { Button } from "../../ui/button";
import { MEMORY_EMPTY_ACTION_LABEL, MEMORY_EMPTY_DESCRIPTION, MEMORY_EMPTY_TITLE } from "../constants/memoryMessages";

const FOX_EMPTY_MEMORY_SRC = "/brand/fox-empty-memory.png";

interface MemoryWallEmptyStateProps {
  onExplore: () => void;
}

export function MemoryWallEmptyState({ onExplore }: MemoryWallEmptyStateProps) {
  return (
    <div className="max-w-md mx-auto text-center px-4">
      <img
        src={FOX_EMPTY_MEMORY_SRC}
        alt=""
        aria-hidden="true"
        className="mx-auto mb-6 h-40 w-40 object-contain sm:h-52 sm:w-52"
      />
      <h3 className="text-2xl font-bold mb-3">{MEMORY_EMPTY_TITLE}</h3>
      <p className="text-muted-foreground mb-8">{MEMORY_EMPTY_DESCRIPTION}</p>
      <Button onClick={onExplore} size="lg" className="rounded-full">
        {MEMORY_EMPTY_ACTION_LABEL}
      </Button>
    </div>
  );
}
