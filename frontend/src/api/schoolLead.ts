import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { LeadStats, TeacherAdmin, TeacherCredentials } from "./types";

export function useSchoolTeachers() {
  return useQuery({
    queryKey: ["me", "school-teachers"],
    queryFn: async () => (await api.get<TeacherAdmin[]>("/me/school/teachers")).data,
  });
}

export function useSchoolStats() {
  return useQuery({
    queryKey: ["me", "school-stats"],
    queryFn: async () => (await api.get<LeadStats>("/me/school/stats")).data,
  });
}

export function useResetSchoolTeacherPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<TeacherCredentials>(`/me/school/teachers/${id}/reset-password`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "school-teachers"] }),
  });
}
