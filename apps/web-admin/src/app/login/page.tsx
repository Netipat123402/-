'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError((err as { message?: string }).message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        {/* แบรนด์ */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-xl font-semibold text-gold shadow-lift">
            N
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Notify</h1>
          <p className="mt-1 text-sm text-muted">Real estate brokerage system</p>
        </div>

        {/* การ์ดเข้าสู่ระบบ */}
        <div className="card p-7">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-ink">Sign in</h2>
            <p className="mt-0.5 text-xs text-muted">For internal staff only</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-soft">Email</label>
              <input id="email" className="field" type="email" autoComplete="username" autoFocus
                placeholder="name@ros.local" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-soft">Password</label>
              <div className="relative">
                <input id="password" className="field pr-16" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted transition hover:text-ink">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <button className="btn-gold w-full" type="submit" disabled={loading || !email || !password}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          © 2026 Notify · Forgot password? Contact your administrator
        </p>
      </div>
    </div>
  );
}
