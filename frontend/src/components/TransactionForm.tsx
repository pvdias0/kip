import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
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
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionFormProps {
  onSubmit: (transaction: {
    type: TransactionType;
    amount: number;
    description: string;
    category_id?: number;
    date: string;
  }) => void;
}

const NO_CATEGORY_VALUE = "__no_category__";
const CREATE_CATEGORY_VALUE = "__create_category__";

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { categories, addCategory } = useCategories();

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setNewCategoryName("");
    setIsCreatingCategory(false);
    setIsSavingCategory(false);
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setIsCreatingCategory(false);
      setNewCategoryName("");
    }
  };

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

    resetForm();
    setOpen(false);
  };

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Nome obrigatorio",
        description: "Informe um nome para criar a categoria.",
      });
      return;
    }

    try {
      setIsSavingCategory(true);
      const createdCategory = await addCategory(trimmedName);
      setCategoryId(createdCategory.id.toString());
      setNewCategoryName("");
      setIsCreatingCategory(false);
      toast({
        title: "Categoria criada",
        description: `"${createdCategory.name}" ja foi selecionada na transacao.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel criar a categoria",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const formatAmountPreview = () => {
    if (!amount) return "R$ 0,00";
    const num = parseFloat(amount);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full gap-2 font-semibold btn-primary-glow sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nova Transação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-lg mx-auto p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={cn(
          "p-6 pb-4 transition-colors duration-300",
          type === "income"
            ? "bg-gradient-to-r from-income/20 to-income/5"
            : "bg-gradient-to-r from-expense/20 to-expense/5"
        )}>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-display flex items-center gap-3">
              <motion.div
                className={cn(
                  "p-2.5 rounded-xl",
                  type === "income"
                    ? "bg-income text-income-foreground"
                    : "bg-expense text-expense-foreground"
                )}
                key={type}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {type === "income" ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </motion.div>
              Adicionar {type === "income" ? "Ganho" : "Gasto"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1.5 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
                type === "income"
                  ? "bg-income text-income-foreground shadow-lg shadow-income/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Ganho</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
                type === "expense"
                  ? "bg-expense text-expense-foreground shadow-lg shadow-expense/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <TrendingDown className="h-4 w-4" />
              Gasto
            </button>
          </div>

          {/* Amount with Preview */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Valor
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-xl font-semibold pl-4 pr-4 border-2 focus:border-primary/50"
                required
              />
              <AnimatePresence>
                {amount && (
                  <motion.div
                    className="absolute -bottom-6 left-0 text-sm"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <span className={cn(
                      "font-semibold",
                      type === "income" ? "text-income" : "text-expense"
                    )}>
                      {formatAmountPreview()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Descrição
            </Label>
            <Input
              id="description"
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 border-2 focus:border-primary/50"
              required
            />
          </div>

          {/* Category & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Categoria
              </Label>
              <Select
                value={categoryId || NO_CATEGORY_VALUE}
                onValueChange={(val) => {
                  if (val === CREATE_CATEGORY_VALUE) {
                    setIsCreatingCategory(true);
                    return;
                  }

                  if (val === NO_CATEGORY_VALUE) {
                    setCategoryId("");
                    setIsCreatingCategory(false);
                    return;
                  }

                  setCategoryId(val);
                  setIsCreatingCategory(false);
                }}
              >
                <SelectTrigger className="h-12 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={NO_CATEGORY_VALUE}>
                    Sem categoria
                  </SelectItem>
                  <SelectSeparator />
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={CREATE_CATEGORY_VALUE}>
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Criar nova categoria
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {isCreatingCategory && (
                <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      Nova categoria
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateCategory();
                      }
                    }}
                    placeholder="Ex: Academia"
                    className="h-11 border-2 focus:border-primary/50"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isSavingCategory || !newCategoryName.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isSavingCategory ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar categoria
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 border-2 focus:border-primary/50"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSavingCategory}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300",
              type === "income"
                ? "bg-income hover:bg-income/90 income-glow"
                : "bg-expense hover:bg-expense/90 expense-glow"
            )}
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar {type === "income" ? "Ganho" : "Gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
