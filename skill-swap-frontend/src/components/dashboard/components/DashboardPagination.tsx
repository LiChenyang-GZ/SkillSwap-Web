import { Button } from "../../ui/button";

interface DashboardPaginationProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function DashboardPagination({ currentPage, pageCount, onPageChange }: DashboardPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={currentPage >= pageCount}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}

