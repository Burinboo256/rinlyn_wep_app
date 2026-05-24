import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listCustomersByAgent, listCustomersBySupervisor, listPoliciesByCustomer } from '@/lib/queries';

function csv(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customers = session.role === 'supervisor'
    ? listCustomersBySupervisor(session.id)
    : listCustomersByAgent(session.id);

  const header = ['ชื่อ-นามสกุล', 'เลขบัตร', 'วันเกิด', 'เบอร์โทร', 'อีเมล', 'ที่อยู่',
    'ผู้รับผลประโยชน์', 'นัดติดต่อถัดไป', 'จำนวนกรมธรรม์', 'เบี้ยรวม', 'ตัวแทน'];
  const rows = customers.map((c: any) => [
    c.full_name, c.national_id || '', c.dob || '', c.phone || '', c.email || '',
    c.address || '', c.beneficiary || '', c.next_contact_date || '',
    c.policy_count, c.total_premium, c.agent_name || session.full_name,
  ]);

  const content = '﻿' + csv([header, ...rows]); // BOM for Thai Excel
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
