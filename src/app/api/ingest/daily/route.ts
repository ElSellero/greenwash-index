import { runDailyPipeline } from '@/lib/ingest/pipeline';
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// Vercel cron sends Authorization: Bearer <CRON_SECRET> — set CRON_SECRET = INGEST_SECRET
// News scanning lives in /api/ingest/news (own cron, own time budget).
export const GET = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const pipeline = await runDailyPipeline();
  return NextResponse.json({ ok: true, pipeline });
};
