import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return <Loader2 className={cn('animate-spin text-brand-500', sizes[size], className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
