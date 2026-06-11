import { runNewsScan } from '@/lib/ingest/classify';
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// Separate cron from /api/ingest/daily: fetching news for 50 persons plus
// LLM classification does not fit the same serverless time budget.
export const GET = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, news: await runNewsScan() });
};
