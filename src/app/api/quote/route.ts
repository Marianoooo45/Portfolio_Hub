import { NextResponse } from 'next/server';
import yahoo from 'yahoo-finance2';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const q = await yahoo.quote(symbol, {
      fields: ['regularMarketPrice','currency','shortName','longName','displayName'],
    });
    const name = (q as any).shortName || (q as any).longName || (q as any).displayName || symbol;
    return NextResponse.json({
      symbol,
      price: q?.regularMarketPrice ?? null,
      currency: (q as any)?.currency ?? null,
      name
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? 'quote failed' }, { status: 500 });
  }
}
