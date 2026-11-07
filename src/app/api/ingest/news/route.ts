import { runNewsScan } from '@/lib/ingest/classify';
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// Separate cron from /api/ingest/daily: fetching news for 50 persons plus
// LLM classification does not fit the same serverless time budget.
export const GET = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const news = await runNewsScan();
  return NextResponse.json({ ok: news.status === 'ok', news },
    { status: news.status === 'failed' ? 503 : news.status === 'busy' ? 409 : 200 });
};
