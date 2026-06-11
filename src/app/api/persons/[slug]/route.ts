import { NextRequest, NextResponse } from 'next/server';
import { getPersonDetail } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  const detail = await getPersonDetail(slug);
  if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.personSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` },
  });
};
