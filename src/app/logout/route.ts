import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function GET() {
  await destroySession();
  // Use a relative Location header so it works behind any reverse proxy (Railway, etc.)
  return new NextResponse(null, {
    status: 302,
    headers: { Location: '/login' },
  });
}
export const POST = GET;
