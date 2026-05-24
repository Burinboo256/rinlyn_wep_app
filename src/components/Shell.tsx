import Link from 'next/link';
import type { SessionUser } from '@/lib/auth';

export default function Shell({
  user,
  nav,
  children,
}: {
  user: SessionUser;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-indigo-700">📋 InsureAgent</Link>
            <nav className="flex gap-3 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-slate-700 hover:text-indigo-700">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/profile" className="text-slate-600 hover:text-indigo-700">
              {user.full_name}{' '}
              <span className="badge bg-slate-200 text-slate-700">
                {user.role === 'supervisor' ? 'หัวหน้า' : 'ตัวแทน'}
              </span>
            </Link>
            <a href="/logout" className="btn-ghost">ออกจากระบบ</a>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
