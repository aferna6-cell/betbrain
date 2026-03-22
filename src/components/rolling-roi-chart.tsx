'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { RollingDataPoint } from '@/lib/analytics'

export function RollingROIChart({ data }: { data: RollingDataPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          Need at least 2 resolved picks on different days to show trends.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(d: string) => {
              const dt = new Date(d + 'T00:00:00')
              return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `${Number(value) > 0 ? '+' : ''}${value}${name === 'roi' ? '%' : 'u'}`,
              name === 'roi' ? 'ROI' : 'Profit',
            ]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(d: any) => {
              const dt = new Date(String(d) + 'T00:00:00')
              return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="roi"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
