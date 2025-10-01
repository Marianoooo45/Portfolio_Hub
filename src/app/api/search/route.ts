// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import yahoo from 'yahoo-finance2';

type QuoteOut = { symbol: string; name: string; exchange?: string; type?: string };

const REGIONS = ['US','FR','GB','DE','IT','ES','NL','BE','CH','SE','CA','AU','IN','HK','JP','SG'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ quotes: [] });

  try {
    const results = await Promise.allSettled(
      REGIONS.map(region =>
        yahoo.search(q, {
          quotesCount: 30,
          newsCount: 0,
          enableFuzzyQuery: true,
          lang: region === 'FR' ? 'fr-FR' : 'en-US',
          region,
        })
      )
    );

    const merged: Record<string, QuoteOut> = {};
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const x of (r.value?.quotes ?? [])) {
        // Filtre objets “utiles”
        if (!x?.symbol) continue;
        const name = (x as any).shortname || (x as any).longname || (x as any).name || (x as any).displayName || x.symbol;
        const entry: QuoteOut = { symbol: x.symbol, name, exchange: (x as any).exchDisp || (x as any).exchange, type: (x as any).quoteType };
        merged[x.symbol] = merged[x.symbol] || entry;
      }
    }

    // Priorités: EQUITY/ETF/CRYPTO/CURRENCY en tête
    const order = { EQUITY: 0, ETF: 1, CRYPTOCURRENCY: 2, CURRENCY: 3, INDEX: 4, MUTUALFUND: 5, OTHER: 9 } as Record<string, number>;
    const quotes = Object.values(merged).sort((a, b) => (order[a.type || 'OTHER'] ?? 9) - (order[b.type || 'OTHER'] ?? 9));

    return NextResponse.json({ quotes });
  } catch (e: any) {
    return NextResponse.json({ quotes: [], error: e?.message ?? 'search failed' }, { status: 500 });
  }
}
