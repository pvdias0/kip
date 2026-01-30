import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
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
import { Trash2, Plus, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

export default function CategoryManagement() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Categorias</h1>
              <p className="text-muted-foreground">
                Gerencie suas categorias de transações
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {deleteError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        {createError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        {/* Create New Category */}
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Categoria
            </CardTitle>
            <CardDescription>
              Crie uma categoria personalizada para suas transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Nome da Categoria</Label>
                <div className="flex gap-2">
                  <Input
                    id="categoryName"
                    placeholder="Ex: Compras online"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={isCreating}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isCreating || !newCategoryName.trim()}
                    className="gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Criar
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Default Categories */}
            {defaultCategories.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                  Categorias Padrão
                </h2>
                <Card className="shadow-md">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {defaultCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Categoria padrão
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>
                                Deletar categoria?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar a categoria "
                                {category.name}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.name,
                                    )
                                  }
                                  className="bg-destructive hover:bg-destructive/90"
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
                <h2 className="text-lg font-semibold mb-3">
                  Minhas Categorias
                </h2>
                <Card className="shadow-md">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {userCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
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
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>
                                Deletar categoria?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar a categoria "
                                {category.name}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.name,
                                    )
                                  }
                                  className="bg-destructive hover:bg-destructive/90"
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
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">
                    Nenhuma categoria encontrada
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
