import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
      <p className="text-8xl font-bold text-brand-600 dark:text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link to="/"><Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>Go back</Button></Link>
        <Link to="/app"><Button leftIcon={<Home className="h-4 w-4" />}>Go to dashboard</Button></Link>
      </div>
    </div>
  );
}
