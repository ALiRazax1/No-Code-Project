import { initials } from '@/utils/format';
import { cn } from '@/utils/cn';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  ring?: boolean;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const colors = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
];

function colorFor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

export function Avatar({ name, src, size = 'md', className, ring }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizes[size],
        ring && 'ring-2 ring-white dark:ring-gray-900',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={cn('flex h-full w-full items-center justify-center', colorFor(name))}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}

interface AvatarGroupProps {
  members: { name: string; avatar?: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ members, max = 3, size = 'sm' }: AvatarGroupProps) {
  const shown = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex -space-x-2">
      {shown.map((m, i) => (
        <Avatar key={i} name={m.name} src={m.avatar} size={size} ring />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ring-2 ring-white dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-900',
            sizes[size],
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
