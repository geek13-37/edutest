import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Curriculum, ExamCatalog } from "./types";

// Каталог статичен (bundled JSON на бэкенде), кэшируем на всю сессию.
export function useCurriculum() {
  return useQuery({
    queryKey: ["catalog", "curriculum"],
    queryFn: async () => (await api.get<Curriculum>("/catalog/curriculum")).data,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useExams() {
  return useQuery({
    queryKey: ["catalog", "exams"],
    queryFn: async () => (await api.get<ExamCatalog>("/catalog/exams")).data,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
