import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { AdminReviewStatusFilter } from '../models/adminReviewStatusModel';

interface AdminReviewToolbarProps {
  statusFilter: AdminReviewStatusFilter;
  isLoading: boolean;
  onStatusFilterChange: (value: AdminReviewStatusFilter) => void;
  onRefresh: () => void;
}

export function AdminReviewToolbar({
  statusFilter,
  isLoading,
  onStatusFilterChange,
  onRefresh,
}: AdminReviewToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as AdminReviewStatusFilter)}
        modal={false}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
