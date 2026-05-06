import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChartIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CategoryChartProps {
  data: { category: string | number; amount: number }[];
  title: string;
  type: "income" | "expense";
  emptyMessage?: string;
}

const INCOME_COLORS = [
  "hsl(149, 68%, 42%)",
  "hsl(195, 84%, 44%)",
  "hsl(41, 92%, 52%)",
  "hsl(271, 70%, 56%)",
  "hsl(13, 85%, 57%)",
  "hsl(175, 72%, 38%)",
  "hsl(222, 78%, 58%)",
  "hsl(329, 76%, 56%)",
];

const EXPENSE_COLORS = [
  "hsl(2, 82%, 58%)",
  "hsl(28, 88%, 54%)",
  "hsl(213, 81%, 54%)",
  "hsl(282, 68%, 57%)",
  "hsl(156, 68%, 42%)",
  "hsl(48, 92%, 50%)",
  "hsl(336, 78%, 55%)",
  "hsl(188, 72%, 40%)",
];

interface ChartItem {
  category: string | number;
  amount: number;
  percentage: number;
  fill: string;
}

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: ChartItem;
  }>;
}

function CategoryTooltip({ active, payload }: CategoryTooltipProps) {
  const item = payload?.[0]?.payload;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="min-w-[11rem] rounded-xl border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: item.fill }}
        />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">
            {item.category}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.percentage.toFixed(1)}% do total
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(item.amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CategoryChart({
  data,
  title,
  type,
  emptyMessage = "Nenhum dado",
}: CategoryChartProps) {
  const colors = type === "income" ? INCOME_COLORS : EXPENSE_COLORS;
  const IconComponent = type === "income" ? TrendingUp : TrendingDown;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const chartData: ChartItem[] = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0,
    fill: colors[index % colors.length],
  }));
  const hasFullCircleSlice =
    chartData.length === 1 ||
    chartData.some((item) => item.percentage >= 99.95);
  const piePaddingAngle = hasFullCircleSlice ? 0 : 3;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
            )}>
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn(
              "p-4 rounded-full mb-4",
              type === "income" ? "bg-income/5" : "bg-expense/5"
            )}>
              <IconComponent className={cn(
                "h-8 w-8",
                type === "income" ? "text-income/40" : "text-expense/40"
              )} />
            </div>
            <p className="text-muted-foreground text-sm">
              {emptyMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
      {/* Decorative accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 opacity-5 transform translate-x-10 -translate-y-10",
        type === "income" ? "text-income" : "text-expense"
      )}>
        <PieChartIcon className="w-full h-full" />
      </div>

      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 relative">
        <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
          )}>
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-6">
        {/* Chart */}
        <motion.div
          className="h-[220px] sm:h-[260px] w-full relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                startAngle={90}
                endAngle={-270}
                paddingAngle={piePaddingAngle}
                dataKey="amount"
                nameKey="category"
                stroke="transparent"
                strokeWidth={0}
                cornerRadius={hasFullCircleSlice ? 0 : 4}
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={item.fill}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                wrapperStyle={{ outline: "none", pointerEvents: "none", zIndex: 20 }}
                content={<CategoryTooltip />}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Total
              </p>
              <p className={cn(
                "text-lg sm:text-xl font-bold number-highlight",
                type === "income" ? "text-income" : "text-expense"
              )}>
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Category breakdown list */}
        <motion.div
          className="mt-6 space-y-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {chartData.map((item, index) => {
            const percentage = item.percentage.toFixed(1);
            return (
              <motion.div
                key={item.category}
                variants={itemVariants}
                className="group flex flex-col gap-2 rounded-xl p-3 text-sm transition-all duration-200 hover:bg-muted/50 cursor-default sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: item.fill,
                      boxShadow: `0 0 0 2px ${item.fill}`,
                    }}
                  />
                  <span className="truncate font-medium">{item.category}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-3 sm:flex-nowrap sm:justify-end">
                  {/* Progress bar */}
                  <div className="hidden sm:block w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.fill }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                  <span className="w-12 text-left text-xs text-muted-foreground sm:text-right">
                    {percentage}%
                  </span>
                  <span className="text-sm font-semibold number-highlight sm:text-base">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
