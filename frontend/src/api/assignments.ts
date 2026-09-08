import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AssignmentOut, AssignmentResults, AttemptReview, StudentAssignment } from "./types";

export function useClassAssignments(classId: string) {
  return useQuery({
    queryKey: ["classes", classId, "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentOut[]>(`/classes/${classId}/assignments`)).data,
  });
}

export function useMyAssignmentsCount() {
  return useQuery({
    queryKey: ["assignments", "mine", "count"],
    queryFn: async () =>
      (await api.get<{ count: number }>("/assignments/mine/count")).data.count,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      test_id: string;
      class_id: string;
      opens_at?: string | null;
      closes_at?: string | null;
      max_attempts?: number | null;
    }) => (await api.post<AssignmentOut>("/assignments", data)).data,
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["classes", a.class_id, "assignments"] });
      qc.invalidateQueries({ queryKey: ["assignments", "mine", "count"] });
    },
  });
}

export function useDeleteAssignment(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes", classId, "assignments"] }),
  });
}

export function useAssignmentResults(id: string) {
  return useQuery({
    queryKey: ["assignments", id, "results"],
    queryFn: async () =>
      (await api.get<AssignmentResults>(`/assignments/${id}/results`)).data,
  });
}

export function useAttemptReview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["attempts", id, "review"],
    enabled,
    queryFn: async () => (await api.get<AttemptReview>(`/attempts/${id}/review`)).data,
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: ["me", "assignments"],
    queryFn: async () => (await api.get<StudentAssignment[]>("/me/assignments")).data,
  });
}
