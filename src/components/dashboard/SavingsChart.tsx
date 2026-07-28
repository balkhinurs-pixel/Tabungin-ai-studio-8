'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const data = [
  { name: 'Jan', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Feb', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Mar', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Apr', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Mei', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Jun', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Jul', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Agu', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Sep', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Okt', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Nov', total: Math.floor(Math.random() * 5000000) + 1000000 },
  { name: 'Des', total: Math.floor(Math.random() * 5000000) + 1000000 },
];

export default function SavingsChart() {
  return (
    <Card className="animate-fade-in-up animation-delay-400">
      <CardHeader>
        <CardTitle>Ikhtisar Tabungan</CardTitle>
        <CardDescription>Perkembangan tabungan Anda sepanjang tahun.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value))}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: 'var(--radius)',
              }}
              cursor={{ fill: 'hsl(var(--muted))' }}
              formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value))}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
