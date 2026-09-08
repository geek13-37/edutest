import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AttemptResult, AttemptState } from "./types";

export function useStartAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) =>
      (await api.post<AttemptState>(`/assignments/${assignmentId}/attempts`)).data,
    onSuccess: (s) => qc.setQueryData(["attempts", s.id], s),
  });
}

export function useAttempt(id: string) {
  return useQuery({
    queryKey: ["attempts", id],
    queryFn: async () => (await api.get<AttemptState>(`/attempts/${id}`)).data,
  });
}

export function useSaveAnswer(attemptId: string) {
  return useMutation({
    mutationFn: async (data: { question_id: string; selected: string[] }) =>
      api.patch(`/attempts/${attemptId}/answers`, data),
  });
}

export function useSubmitAttempt(attemptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post<AttemptResult>(`/attempts/${attemptId}/submit`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "assignments"] }),
  });
}
