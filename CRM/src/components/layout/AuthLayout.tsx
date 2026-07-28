import { Outlet, Link } from 'react-router-dom';
import { Sparkles, BarChart3, Users, ShieldCheck } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-600 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Nexus CRM</span>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Manage your customers, leads, and projects — all in one place.
          </h2>
          <p className="max-w-md text-brand-100">
            The modern CRM platform that helps teams close more deals and deliver exceptional customer experiences.
          </p>
          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            {[
              { icon: Users, label: 'Customer management' },
              { icon: BarChart3, label: 'Real-time analytics' },
              { icon: ShieldCheck, label: 'Enterprise security' },
              { icon: Sparkles, label: 'Smart automation' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <f.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-brand-200">© 2024 Nexus CRM. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Nexus CRM</span>
          </div>
          <Outlet />
          <p className="mt-8 text-center text-xs text-gray-400">
            By continuing you agree to our{' '}
            <Link to="#" className="text-brand-600 hover:underline">Terms</Link> and{' '}
            <Link to="#" className="text-brand-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
