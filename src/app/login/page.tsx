import { redirect } from 'next/navigation';
import { createSession, findUserByUsername, verifyPassword, getSession } from '@/lib/auth';

async function login(formData: FormData) {
  'use server';
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const user = findUserByUsername(username);
  if (!user) return redirect('/login?e=1');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return redirect('/login?e=1');
  await createSession({
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    supervisor_id: user.supervisor_id,
  });
  redirect(user.role === 'supervisor' ? '/supervisor' : '/agent');
}

export default async function LoginPage({ searchParams }: { searchParams: { e?: string } }) {
  const s = await getSession();
  if (s) redirect(s.role === 'supervisor' ? '/supervisor' : '/agent');
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form action={login} className="card w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-sm text-slate-500">ระบบจัดการตัวแทนประกันชีวิต</p>
        </div>
        {searchParams.e && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</div>
        )}
        <div>
          <label className="label">ชื่อผู้ใช้</label>
          <input className="input" name="username" required autoFocus />
        </div>
        <div>
          <label className="label">รหัสผ่าน</label>
          <input className="input" name="password" type="password" required />
        </div>
        <button className="btn-primary w-full" type="submit">เข้าสู่ระบบ</button>
        <p className="text-xs text-slate-500 text-center">
          ทดลอง: <code>boss / boss123</code> หรือ <code>agent1 / agent123</code>
        </p>
      </form>
    </div>
  );
}
