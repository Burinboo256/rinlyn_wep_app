import Link from 'next/link';
import type { SessionUser } from '@/lib/auth';

const agentIcons: Record<string, string>  = { '/agent': '👥', '/agent/new': '➕', '/profile': '👤' };
const supIcons: Record<string, string>    = {
  '/supervisor': '📊', '/supervisor/customers': '👥', '/supervisor/team': '👔',
  '/supervisor/expiring': '⏰', '/supervisor/products': '📦', '/supervisor/commission': '💰', '/profile': '👤',
};

export default function Shell({
  user,
  nav,
  children,
}: {
  user: SessionUser;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const icons = user.role === 'supervisor' ? supIcons : agentIcons;
  // Bottom nav: show first 4 items + profile
  const bottomNav = [...nav.filter(n => icons[n.href]).slice(0, 4), { href: '/profile', label: 'โปรไฟล์' }];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Desktop / mobile header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-indigo-700 whitespace-nowrap">📋 InsureAgent</Link>
            <nav className="hidden md:flex gap-3 text-sm flex-wrap">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-slate-700 hover:text-indigo-700 whitespace-nowrap">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm shrink-0">
            <Link href="/profile" className="hidden md:inline-flex items-center gap-1 text-slate-600 hover:text-indigo-700">
              {user.full_name}
              <span className="badge bg-slate-200 text-slate-700">
                {user.role === 'supervisor' ? 'หัวหน้า' : 'ตัวแทน'}
              </span>
            </Link>
            <a href="/logout" className="btn-ghost !py-1 !px-2 text-xs">ออก</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 md:py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav shadow-lg">
        {bottomNav.map((n) => (
          <Link key={n.href} href={n.href}>
            <span className="text-lg">{icons[n.href] || '•'}</span>
            <span className="text-[10px] leading-tight">{n.label.replace('← ', '')}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
