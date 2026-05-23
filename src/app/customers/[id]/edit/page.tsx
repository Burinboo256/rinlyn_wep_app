import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import CustomerForm from '@/components/CustomerForm';
import { getCustomer } from '@/lib/queries';
import { updateCustomer } from '@/lib/actions';

export default async function EditCustomer({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { e?: string };
}) {
  const u = await requireUser();
  const id = Number(params.id);
  const c = getCustomer(id);
  if (!c) notFound();
  if (u.role === 'agent' && c.agent_id !== u.id) redirect('/agent');

  return (
    <Shell user={u} nav={[{ href: `/customers/${id}`, label: '← กลับ' }]}>
      <h1 className="text-2xl font-bold mb-4">แก้ไขลูกค้า</h1>
      <CustomerForm
        action={async (fd: FormData) => { 'use server'; await updateCustomer(id, fd); }}
        initial={c}
        submitLabel="บันทึก"
        errorCode={searchParams.e}
      />
    </Shell>
  );
}
