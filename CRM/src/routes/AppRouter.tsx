import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomersPage = lazy(() => import('@/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const CustomerDetailsPage = lazy(() => import('@/pages/CustomerDetailsPage').then((m) => ({ default: m.CustomerDetailsPage })));
const LeadsPage = lazy(() => import('@/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailsPage = lazy(() => import('@/pages/ProjectDetailsPage').then((m) => ({ default: m.ProjectDetailsPage })));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const InvoiceDetailsPage = lazy(() => import('@/pages/InvoiceDetailsPage').then((m) => ({ default: m.InvoiceDetailsPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<FullPageSpinner />}>{el}</Suspense>;

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <PublicOnly>{withSuspense(<LoginPage />)}</PublicOnly> },
      { path: '/register', element: <PublicOnly>{withSuspense(<RegisterPage />)}</PublicOnly> },
      { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
    ],
  },
  {
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { path: '/app', element: withSuspense(<DashboardPage />) },
      { path: '/app/customers', element: withSuspense(<CustomersPage />) },
      { path: '/app/customers/:id', element: withSuspense(<CustomerDetailsPage />) },
      { path: '/app/leads', element: withSuspense(<LeadsPage />) },
      { path: '/app/tasks', element: withSuspense(<TasksPage />) },
      { path: '/app/projects', element: withSuspense(<ProjectsPage />) },
      { path: '/app/projects/:id', element: withSuspense(<ProjectDetailsPage />) },
      { path: '/app/invoices', element: withSuspense(<InvoicesPage />) },
      { path: '/app/invoices/:id', element: withSuspense(<InvoiceDetailsPage />) },
      { path: '/app/calendar', element: withSuspense(<CalendarPage />) },
      { path: '/app/messages', element: withSuspense(<MessagesPage />) },
      { path: '/app/reports', element: withSuspense(<ReportsPage />) },
      { path: '/app/settings', element: withSuspense(<SettingsPage />) },
    ],
  },
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]);

export function AppRouter() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
