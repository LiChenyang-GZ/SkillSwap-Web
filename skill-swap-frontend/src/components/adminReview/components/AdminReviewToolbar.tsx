import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

interface AdminReviewToolbarProps {
  statusFilter: string;
  isLoading: boolean;
  onStatusFilterChange: (value: string) => void;
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
      <Select value={statusFilter} onValueChange={onStatusFilterChange} modal={false}>
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
