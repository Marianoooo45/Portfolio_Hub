// src/components/HeatmapTickers.tsx
'use client';
import { motion } from 'framer-motion';
import type { Position } from '../app/page';

export default function HeatmapTickers({ positions, meta, className }:{
  positions: Position[];
  meta: Record<string, { name:string; currency?:string; logo?:string }>;
  className?: string;
}){
  if (!positions.length) return null;

  const max = Math.max(...positions.map(p=>Math.abs(p.pnlPct||0)), .01);

  return (
    <div
      /* theme */
      className={`af-card af-card--pad rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-900/20 shadow-2xl p-4 text-amber-50 ${className ?? ''}`}
    >
      <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {positions.map((p,i)=>{
          const intensity = Math.min(1, Math.abs(p.pnlPct||0)/max);
          const bg = p.pnlPct>=0
            ? `rgba(26,209,139,${0.10+0.35*intensity})`
            : `rgba(255,107,107,${0.10+0.35*intensity})`;
          return (
            <motion.div
              key={p.ticker}
              initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay:i*0.03}}
              className="p-3 rounded-xl border" style={{borderColor:'#2d3a4f', background:bg}}
            >
              <div className="flex items-center gap-2">
                <img src={meta[p.ticker]?.logo} alt="" className="w-6 h-6 rounded-full border border-[#2d3a4f] object-contain"/>
                <div className="text-sm font-semibold">{meta[p.ticker]?.name ?? p.ticker}</div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="af-dim">{p.ticker} • {meta[p.ticker]?.currency ?? 'EUR'}</span>
                /* theme */
                <span className={p.pnlPct>=0 ? 'text-emerald-400' : 'text-rose-400'}>{(p.pnlPct*100).toFixed(2)}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
