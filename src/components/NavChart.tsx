// src/components/NavChart.tsx
'use client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function NavChart({ data }:{ data: {date:string; value:number}[] }){
  if (!data.length) return <div className="af-chart center af-dim flex items-center justify-center">Aucune donnée</div>;
  return (
    <div className="af-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#79b7ff" stopOpacity={0.35}/>
              <stop offset="100%" stopColor="#c4996c" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize:12, fill:'#9fb1c6' }}/>
          <YAxis hide />
          <Tooltip
            formatter={(v)=>[(v as number).toLocaleString('fr-FR',{maximumFractionDigits:2})+' €','Valeur']}
            labelFormatter={(v)=>new Date(v as string).toLocaleDateString('fr-FR')}
          />
          <Area dataKey="value" type="monotone" stroke="#79b7ff" fill="url(#navFill)" strokeWidth={2}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
