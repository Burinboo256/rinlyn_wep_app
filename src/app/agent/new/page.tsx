import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import CustomerForm from '@/components/CustomerForm';
import { createCustomer } from '@/lib/actions';

export default async function NewCustomer({ searchParams }: { searchParams: { e?: string } }) {
  const u = await requireUser();
  return (
    <Shell user={u} nav={[{ href: '/agent', label: '← กลับ' }]}>
      <h1 className="text-2xl font-bold mb-4">เพิ่มลูกค้าใหม่</h1>
      <CustomerForm action={createCustomer} submitLabel="บันทึก" errorCode={searchParams.e} />
    </Shell>
  );
}
