import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api";

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getCategories();
      setCategories((response.categories as Category[]) || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar categorias";
      setError(message);
      console.error("Fetch categories error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Create category
  const addCategory = useCallback(async (name: string) => {
    try {
      setError(null);
      const response = await apiService.createCategory(name);
      setCategories((prev) => [...prev, response.category as Category]);
      return response.category;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar categoria";
      setError(message);
      throw err;
    }
  }, []);

  // Delete category
  const removeCategory = useCallback(async (id: number) => {
    try {
      setError(null);
      await apiService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao deletar categoria";
      setError(message);
      throw err;
    }
  }, []);

  return {
    categories,
    isLoading,
    error,
    addCategory,
    removeCategory,
    refetch: fetchCategories,
  };
}
