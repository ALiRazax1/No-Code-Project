import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Palette, Moon, Sun, Upload } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import { authService } from '@/services/authService';
import { supabase, AVATAR_BUCKET } from '@/services/supabase';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
});
const passwordSchema = z.object({
  current: z.string().min(1, 'Current password required'),
  next: z.string().min(6, 'At least 6 characters'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type Tab = 'profile' | 'password' | 'theme' | 'notifications';

const tabs: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'password', label: 'Password', icon: Lock },
  { key: 'theme', label: 'Theme', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('profile');
  const [uploading, setUploading] = useState(false);

  const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '', email: user?.email ?? '' } });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const [notif, setNotif] = useState({ email: true, push: false, weekly: true, mentions: true });

  const onProfile = async (data: { name: string; email: string }) => {
    try {
      const updated = await authService.updateProfile(data.name);
      updateUser(updated);
      toast.success('Profile updated');
      profileForm.reset({ name: updated.name, email: updated.email });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const onPassword = async (data: { current: string; next: string; confirm: string }) => {
    try {
      await authService.changePassword(data.current, data.next);
      toast.success('Password changed');
      passwordForm.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Password change failed');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const updated = await authService.updateAvatar(pub.publicUrl);
      if (updated) updateUser(updated);
      toast.success('Avatar updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account preferences" breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Settings' }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Tabs */}
        <Card className="h-fit lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', tab === t.key ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800')}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </Card>

        <div className="lg:col-span-3">
          {tab === 'profile' && (
            <Card>
              <CardHeader title="Profile" subtitle="Update your personal information" />
              <div className="mb-6 flex items-center gap-4">
                <Avatar name={user?.name ?? 'User'} src={user?.avatar} size="lg" />
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Change photo'}
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">JPG or PNG, max 2MB</p>
                </div>
              </div>
              <form onSubmit={profileForm.handleSubmit(onProfile)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full name" error={profileForm.formState.errors.name?.message as string} {...profileForm.register('name')} />
                <Input label="Email" type="email" error={profileForm.formState.errors.email?.message as string} {...profileForm.register('email')} />
                <div className="sm:col-span-2">
                  <Button type="submit" loading={profileForm.formState.isSubmitting}>Save changes</Button>
                </div>
              </form>
            </Card>
          )}

          {tab === 'password' && (
            <Card>
              <CardHeader title="Change Password" subtitle="Update your account password" />
              <form onSubmit={passwordForm.handleSubmit(onPassword)} className="max-w-md space-y-4">
                <Input label="Current password" type="password" error={passwordForm.formState.errors.current?.message as string} {...passwordForm.register('current')} />
                <Input label="New password" type="password" error={passwordForm.formState.errors.next?.message as string} {...passwordForm.register('next')} />
                <Input label="Confirm new password" type="password" error={passwordForm.formState.errors.confirm?.message as string} {...passwordForm.register('confirm')} />
                <Button type="submit" loading={passwordForm.formState.isSubmitting}>Update password</Button>
              </form>
            </Card>
          )}

          {tab === 'theme' && (
            <Card>
              <CardHeader title="Appearance" subtitle="Choose your preferred theme" />
              <div className="grid grid-cols-2 gap-4">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn('rounded-xl border-2 p-4 text-left transition', theme === t ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-800')}
                  >
                    <div className={cn('mb-3 flex h-20 items-center justify-center rounded-lg', t === 'light' ? 'bg-gray-100' : 'bg-gray-900')}>
                      {t === 'light' ? <Sun className="h-8 w-8 text-amber-500" /> : <Moon className="h-8 w-8 text-brand-400" />}
                    </div>
                    <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">{t} mode</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t === 'light' ? 'Bright and clean' : 'Easy on the eyes'}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader title="Notifications" subtitle="Choose what you want to be notified about" />
              <div className="space-y-1">
                {([
                  { key: 'email', label: 'Email notifications', desc: 'Receive emails about your account activity' },
                  { key: 'push', label: 'Push notifications', desc: 'Get push notifications in your browser' },
                  { key: 'weekly', label: 'Weekly digest', desc: 'A summary of your week every Monday' },
                  { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you in a comment' },
                ] as const).map((n) => (
                  <div key={n.key} className="flex items-center justify-between border-b border-gray-100 py-4 last:border-0 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotif((p) => ({ ...p, [n.key]: !p[n.key] }))}
                      className={cn('relative h-6 w-11 rounded-full transition', notif[n.key] ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700')}
                    >
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', notif[n.key] ? 'left-[1.375rem]' : 'left-0.5')} />
                    </button>
                  </div>
                ))}
              </div>
              <Button className="mt-4" onClick={() => toast.success('Notification preferences saved')}>Save preferences</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
