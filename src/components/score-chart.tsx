'use client';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankedProduct } from '@/lib/domain';
export default function ScoreChart({ candidate }: { candidate: RankedProduct }) {
  const data = Object.entries(candidate.scores).map(([name, score]) => ({
    name,
    score: Math.round(score),
  }));
  return (
    <div
      className="score-chart"
      role="img"
      aria-label={data.map((d) => `${d.name}: ${d.score}`).join(', ')}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 18 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            dataKey="name"
            type="category"
            width={80}
            tick={{ fill: '#98a5b7', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#171f2b',
              border: '1px solid #303e50',
              borderRadius: 8,
              color: '#eef3fb',
            }}
          />
          <Bar dataKey="score" fill="#71a6f9" radius={[0, 3, 3, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
