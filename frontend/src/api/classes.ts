import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ClassOut, StudentClass } from "./types";

export interface ClassNameInput {
  grade?: number;
  letter?: string;
  name?: string;
}

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get<ClassOut[]>("/classes")).data,
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ["classes", id],
    queryFn: async () => (await api.get<ClassOut>(`/classes/${id}`)).data,
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassNameInput) => (await api.post<ClassOut>("/classes", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useUpdateClass(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ClassNameInput & { archived?: boolean }) =>
      (await api.patch<ClassOut>(`/classes/${id}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["classes", id] });
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useMyClasses() {
  return useQuery({
    queryKey: ["me", "classes"],
    queryFn: async () => (await api.get<StudentClass[]>("/me/classes")).data,
  });
}
