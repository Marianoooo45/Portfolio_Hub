// src/app/api/history/route.ts
import { NextResponse } from 'next/server';
import yahoo from 'yahoo-finance2';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from') || '2000-01-01';
  const to = searchParams.get('to') || new Date().toISOString().slice(0,10);
  if (!symbol) return NextResponse.json({ error:'symbol required' }, { status:400 });

  try {
    const res = await yahoo.historical(symbol, { period1: from, period2: to, interval: '1d' });
    const data = res
      .map(r => ({ date: r.date.toISOString().slice(0,10), close: Number(r.close) }))
      .filter(x => Number.isFinite(x.close));
    return NextResponse.json(data);
  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? 'history failed' }, { status:500 });
  }
}
