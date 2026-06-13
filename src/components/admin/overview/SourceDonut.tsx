import { Card } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = [
  "hsl(217 91% 60%)", "hsl(160 84% 39%)", "hsl(43 96% 56%)", "hsl(280 84% 60%)",
  "hsl(0 84% 60%)", "hsl(190 84% 50%)", "hsl(340 84% 60%)", "hsl(120 60% 45%)",
];

interface Props {
  title: string;
  data: { name: string; value: number }[];
}

export function SourceDonut({ title, data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="p-4 h-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-12">No data</p>
      </Card>
    );
  }
  return (
    <Card className="p-4 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
