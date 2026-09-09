import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { QuestionDraft, TestDetail, TestOut } from "./types";

export function useTests(subject?: string) {
  return useQuery({
    queryKey: ["tests", subject ?? "all"],
    queryFn: async () =>
      (await api.get<TestOut[]>("/tests", { params: subject ? { subject } : {} })).data,
  });
}

export function useTest(id: string) {
  return useQuery({
    queryKey: ["tests", id],
    queryFn: async () => (await api.get<TestDetail>(`/tests/${id}`)).data,
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      subject?: string | null;
      grade?: number | null;
      topic?: string | null;
      template_ref?: string | null;
    }) => (await api.post<TestOut>("/tests", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}

export function useUpdateTest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<TestOut, "id" | "created_at" | "updated_at">>) =>
      (await api.patch<TestDetail>(`/tests/${id}`, patch)).data,
    onSuccess: (data) => qc.setQueryData(["tests", id], data),
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}

export function useReplaceQuestions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questions: QuestionDraft[]) =>
      (await api.put<TestDetail>(`/tests/${id}/questions`, { questions })).data,
    onSuccess: (data) => qc.setQueryData(["tests", id], data),
  });
}

export function usePublishTest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (publish: boolean) =>
      (await api.post<TestDetail>(`/tests/${id}/${publish ? "publish" : "unpublish"}`)).data,
    onSuccess: (data) => {
      qc.setQueryData(["tests", id], data);
      qc.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useAIGenerate(id: string) {
  return useMutation({
    mutationFn: async (data: { prompt: string; count: number; mode: "replace" | "append" }) =>
      (await api.post<{ questions: QuestionDraft[] }>(`/tests/${id}/ai/generate`, data)).data
        .questions,
  });
}

export function useAIRevise(id: string) {
  return useMutation({
    mutationFn: async (data: { prompt: string; questions: QuestionDraft[] }) =>
      (await api.post<{ questions: QuestionDraft[] }>(`/tests/${id}/ai/revise`, data)).data.questions,
  });
}
