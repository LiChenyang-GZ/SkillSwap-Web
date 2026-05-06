import { Eye, Plus, RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";

interface MemoryStudioHeaderProps {
  isLoading: boolean;
  onBackToMemory: () => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

export function MemoryStudioHeader({
  isLoading,
  onBackToMemory,
  onRefresh,
  onCreateNew,
}: MemoryStudioHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Memory Studio</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={onBackToMemory}>
            <Eye className="w-4 h-4 mr-2" />
            Open Public Memory Wall
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>
    </div>
  );
}
