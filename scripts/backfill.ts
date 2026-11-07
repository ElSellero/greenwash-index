import { runNewsScan } from '../src/lib/ingest/classify';

// DOC 2.0 supports the last three months, not an archive back to 2020.
// 89 days stays inside that boundary, including short calendar months.
runNewsScan({ lookbackDays: 89, budgetMs: 50 * 60_000, cap: 150 })
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'failed' || result.status === 'degraded') process.exitCode = 1;
  })
  .catch(err => { console.error('News catch-up aborted:', err); process.exitCode = 1; });
