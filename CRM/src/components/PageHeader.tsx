import { type ReactNode } from 'react';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumbs && <Breadcrumb items={breadcrumbs} className="mb-2" />}
        {title && <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>}
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
