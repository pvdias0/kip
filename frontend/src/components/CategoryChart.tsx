import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon } from "lucide-react";

interface CategoryChartProps {
  data: { category: string | number; amount: number }[];
  title: string;
  type: "income" | "expense";
  emptyMessage?: string;
}

const INCOME_COLORS = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"];
const EXPENSE_COLORS = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"];

export function CategoryChart({
  data,
  title,
  type,
  emptyMessage = "Nenhum dado",
}: CategoryChartProps) {
  const colors = type === "income" ? INCOME_COLORS : EXPENSE_COLORS;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="h-[200px] sm:h-[250px] lg:h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    className="transition-all hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs sm:text-sm">{value}</span>}
                wrapperStyle={{ paddingTop: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown list */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div
              key={item.category}
              className="flex items-center justify-between text-xs sm:text-sm p-2 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="truncate">{item.category}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                <span className="text-muted-foreground">
                  {((item.amount / total) * 100).toFixed(1)}%
                </span>
                <span className="font-medium whitespace-nowrap">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
