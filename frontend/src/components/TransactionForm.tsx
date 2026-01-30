import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionType } from "@/types/finance";
import { useCategories } from "@/hooks/useCategories";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionFormProps {
  onSubmit: (transaction: {
    type: TransactionType;
    amount: number;
    description: string;
    category_id?: number;
    date: string;
  }) => void;
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { categories } = useCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      description,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      date,
    });

    // Reset form
    setAmount("");
    setDescription("");
    setCategoryId("");
    setDate(new Date().toISOString().split("T")[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-1 sm:gap-2 w-full xs:w-auto text-xs sm:text-base shadow-lg">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden xs:inline">Nova Transação</span>
          <span className="xs:hidden">Nova</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl">Adicionar Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all",
                type === "income"
                  ? "bg-income text-income-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Ganho</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all",
                type === "expense"
                  ? "bg-expense text-expense-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
              Gasto
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs sm:text-sm">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm sm:text-lg"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs sm:text-sm">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs sm:text-sm"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs sm:text-sm">Categoria (Opcional)</Label>
            <Select
              value={categoryId || "placeholder"}
              onValueChange={(val) =>
                setCategoryId(val === "placeholder" ? "" : val)
              }
            >
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-xs sm:text-sm">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs sm:text-sm"
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Adicionar {type === "income" ? "Ganho" : "Gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
