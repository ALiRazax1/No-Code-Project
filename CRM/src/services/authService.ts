import { supabase } from './supabase';
import type { User } from '@/types';

function mapUser(id: string, email: string, profile?: { name: string; avatar_url: string | null; role: string } | null): User {
  return {
    id,
    email,
    name: profile?.name ?? '',
    avatar: profile?.avatar_url ?? undefined,
    role: (profile?.role as User['role']) ?? 'agent',
  };
}

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Login failed');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_url, role')
      .eq('id', data.user.id)
      .maybeSingle();

    return {
      user: mapUser(data.user.id, data.user.email ?? email, profile),
      token: data.session.access_token,
    };
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Registration failed');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_url, role')
      .eq('id', data.user.id)
      .maybeSingle();

    return {
      user: mapUser(data.user.id, data.user.email ?? email, profile ?? { name, avatar_url: null, role: 'agent' }),
      token: data.session.access_token,
    };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { message: 'Password reset link sent to your email' };
  },

  async resetPassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async updateProfile(name: string): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.updateUser({ data: { name } });
    if (authError) throw new Error(authError.message);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', authData.user!.id)
      .select('name, avatar_url, role')
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    return mapUser(authData.user!.id, authData.user!.email ?? '', profile);
  },

  async updateAvatar(avatarUrl: string): Promise<User | null> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', authData.user.id)
      .select('name, avatar_url, role')
      .maybeSingle();
    if (error) throw new Error(error.message);

    return mapUser(authData.user.id, authData.user.email ?? '', profile);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Verify current password by re-authenticating
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Not authenticated');

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authData.user.email ?? '',
      password: currentPassword,
    });
    if (verifyError) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle();

    return mapUser(user.id, user.email ?? '', profile);
  },

  async getSession(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },
};
