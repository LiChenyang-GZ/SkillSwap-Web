import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { AdminReviewStatusFilter } from '../models/adminReviewStatusModel';
import {
  ADMIN_REVIEW_STATUS_FILTER_OPTIONS,
  isAdminReviewStatusFilter,
} from '../constants/adminReviewStatusConstants';

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
        onValueChange={(value: string) => {
          if (isAdminReviewStatusFilter(value)) {
            onStatusFilterChange(value);
          }
        }}
        modal={false}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_REVIEW_STATUS_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
