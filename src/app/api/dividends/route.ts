import { NextResponse } from 'next/server';
import yahoo from 'yahoo-finance2';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from') || '2000-01-01';
  const to = searchParams.get('to') || new Date().toISOString().slice(0,10);
  if (!symbol) return NextResponse.json({ error:'symbol required' }, { status:400 });

  try {
    // Historique de dividendes
    const rows:any[] = await yahoo.historical(symbol, { period1: from, period2: to, events: 'div' } as any);
    const history = rows
      .map((r:any) => ({
        date: r?.date?.toISOString?.() ? r.date.toISOString().slice(0,10) : (r?.date?.slice?.(0,10) || r?.asOfDate || ''),
        amount: Number(r.dividends ?? r.amount ?? r.adjDividend ?? r.value ?? r.divCash ?? 0)
      }))
      .filter(x => x.date && Number.isFinite(x.amount) && x.amount !== 0);

    // Prochaine ex-date (si connue) + estimation
    const qs:any = await yahoo.quoteSummary(symbol, { modules: ['calendarEvents','summaryDetail'] });
    const ex = qs?.calendarEvents?.exDividendDate?.raw ? new Date(qs.calendarEvents.exDividendDate.raw*1000) : null;
    let nextAmount: number | null = null;
    if (ex) {
      // Estimation simple: moyenne des 4 derniers paiements sinon dividendRate/4
      const last = history.slice(-4);
      if (last.length) {
        nextAmount = last.reduce((s,x)=>s+x.amount,0) / last.length;
      } else if (qs?.summaryDetail?.dividendRate?.raw) {
        nextAmount = Number(qs.summaryDetail.dividendRate.raw) / 4;
      }
    }

    return NextResponse.json({
      history,
      next: ex ? { exDate: ex.toISOString().slice(0,10), amountEst: nextAmount } : null,
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? 'dividends failed' }, { status:500 });
  }
}
