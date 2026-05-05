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

// Premium color palettes
const INCOME_COLORS = [
  "hsl(152, 76%, 40%)",
  "hsl(158, 70%, 45%)",
  "hsl(162, 65%, 50%)",
  "hsl(168, 60%, 45%)",
  "hsl(172, 55%, 40%)",
];

const EXPENSE_COLORS = [
  "hsl(0, 84%, 60%)",
  "hsl(10, 78%, 55%)",
  "hsl(20, 72%, 50%)",
  "hsl(350, 80%, 55%)",
  "hsl(340, 75%, 50%)",
];

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
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="amount"
                nameKey="category"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                  padding: "12px 16px",
                  fontSize: "13px",
                }}
                labelStyle={{
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
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
          {data.map((item, index) => {
            const percentage = ((item.amount / total) * 100).toFixed(1);
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
                      backgroundColor: colors[index % colors.length],
                      boxShadow: `0 0 0 2px ${colors[index % colors.length]}`,
                    }}
                  />
                  <span className="truncate font-medium">{item.category}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-3 sm:flex-nowrap sm:justify-end">
                  {/* Progress bar */}
                  <div className="hidden sm:block w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
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
