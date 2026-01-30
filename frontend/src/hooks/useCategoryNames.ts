import { useCategories } from "./useCategories";
import { useMemo } from "react";

export function useCategoryNames() {
  const { categories } = useCategories();

  return useMemo(() => {
    const categoryMap = new Map<number, string>();

    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.name);
    });

    const getCategoryName = (categoryId: number | null): string => {
      if (categoryId === null) {
        return "Sem categoria";
      }
      return categoryMap.get(categoryId) || `Categoria ${categoryId}`;
    };

    return { categoryMap, getCategoryName };
  }, [categories]);
}
