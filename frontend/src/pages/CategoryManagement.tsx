import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function CategoryManagement() {
  const { categories, addCategory, removeCategory, isLoading, error } =
    useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSuccessMessage(null);

    if (!newCategoryName.trim()) {
      setCreateError("Nome da categoria não pode estar vazio");
      return;
    }

    try {
      setIsCreating(true);
      await addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setSuccessMessage("Categoria criada com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Erro ao criar categoria",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    setDeleteError(null);
    try {
      await removeCategory(id);
      setSuccessMessage(`Categoria "${name}" deletada com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Erro ao deletar categoria",
      );
    }
  };

  const defaultCategories = categories.filter((c) => c.user_id === null);
  const userCategories = categories.filter((c) => c.user_id !== null);

  return (
    <AppShell
      title="Categorias"
      subtitle="Gerencie suas categorias de transacoes"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 px-3 py-6 sm:px-4 sm:py-8">
        <div className="w-full">

        {/* Messages */}
        {successMessage && (
          <Alert variant="success" className="mb-3 sm:mb-4">
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-3 sm:mb-4">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {deleteError && (
          <Alert variant="destructive" className="mb-3 sm:mb-4">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">{deleteError}</AlertDescription>
          </Alert>
        )}

        {createError && (
          <Alert variant="destructive" className="mb-3 sm:mb-4">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">{createError}</AlertDescription>
          </Alert>
        )}

        {/* Create New Category */}
        <Card className="mb-4 sm:mb-6 shadow-md">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Nova Categoria</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Crie uma categoria personalizada para suas transações
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
            <form onSubmit={handleAddCategory} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName" className="text-xs sm:text-sm">Nome da Categoria</Label>
                <div className="flex gap-1 sm:gap-2 flex-col xs:flex-row">
                  <Input
                    id="categoryName"
                    placeholder="Ex: Compras online"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={isCreating}
                    className="flex-1 text-xs sm:text-base"
                  />
                  <Button
                    type="submit"
                    disabled={isCreating || !newCategoryName.trim()}
                    className="gap-1 sm:gap-2 w-full xs:w-auto text-xs sm:text-base"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden xs:inline">Criando...</span>
                        <span className="xs:hidden">Criar</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Criar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Default Categories */}
            {defaultCategories.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h2 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-3 text-muted-foreground">
                  Categorias Padrão
                </h2>
                <Card className="shadow-md">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {defaultCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 p-3 xs:p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-base truncate">{category.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Categoria padrão
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full xs:w-auto h-8"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:max-w-sm mx-auto">
                              <AlertDialogTitle className="text-base sm:text-lg">
                                Deletar categoria?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                Tem certeza que deseja deletar a categoria "
                                {category.name}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.name,
                                    )
                                  }
                                  className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Categories */}
            {userCategories.length > 0 && (
              <div>
                <h2 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-3">
                  Minhas Categorias
                </h2>
                <Card className="shadow-md">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {userCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 p-3 xs:p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-base truncate">{category.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Criada em{" "}
                              {new Date(category.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full xs:w-auto h-8"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:max-w-sm mx-auto">
                              <AlertDialogTitle className="text-base sm:text-lg">
                                Deletar categoria?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                Tem certeza que deseja deletar a categoria "
                                {category.name}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.name,
                                    )
                                  }
                                  className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty State */}
            {categories.length === 0 && (
              <Card className="shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <p className="text-xs sm:text-base text-muted-foreground mb-4">
                    Nenhuma categoria encontrada
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
        </div>
      </div>
    </AppShell>
  );
}
