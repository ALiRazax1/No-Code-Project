import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onPageChange, total, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * (pageSize ?? 0) + 1;
  const to = Math.min(page * (pageSize ?? 0), total ?? 0);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {total !== undefined && pageSize !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <span className="font-medium text-gray-700 dark:text-gray-300">{from}</span> to{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{to}</span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> results
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
            if (p === 2 || p === totalPages - 1) {
              return <span key={p} className="px-1 text-gray-400">…</span>;
            }
            return null;
          }
          return (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'outline'}
              size="icon"
              onClick={() => onPageChange(p)}
              className="text-xs"
            >
              {p}
            </Button>
          );
        })}
        <Button variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
