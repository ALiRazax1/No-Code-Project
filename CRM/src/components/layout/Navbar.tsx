import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { formatRelativeTime } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
  });
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationService.unreadCount,
  });

  const markAllMut = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search anything…"
          className="input-base h-9 pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <Dropdown
          trigger={
            <span className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Bell className="h-5 w-5" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-gray-900">
                  {unreadCount}
                </span>
              )}
            </span>
          }
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(notifications ?? []).length === 0 ? 'You are all caught up' : `${unreadCount ?? 0} unread`}
              </p>
            </div>
            {(unreadCount ?? 0) > 0 && (
              <button
                onClick={() => markAllMut.mutate()}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <DropdownDivider />
          {(notifications ?? []).length === 0 ? (
            <div className="py-4">
              <EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications" />
            </div>
          ) : (
            (notifications ?? []).slice(0, 6).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.read ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{n.description}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </Dropdown>

        <Dropdown
          trigger={
            <span className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-800">
              <Avatar name={user?.name ?? 'User'} src={user?.avatar} size="sm" />
            </span>
          }
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <DropdownDivider />
          <DropdownItem icon={<Search className="h-4 w-4" />} onClick={() => navigate('/app/settings')}>
            Settings
          </DropdownItem>
          <DropdownItem
            danger
            icon={<span className="h-4 w-4" />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
