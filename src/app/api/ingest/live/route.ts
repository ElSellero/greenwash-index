import { runLiveIngest } from '@/lib/ingest/pipeline';
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runLiveIngest()) });
};
