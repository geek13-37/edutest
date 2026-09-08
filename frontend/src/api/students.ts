import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { tokenStore } from "@/lib/tokens";
import type { ClassMember, StudentCredentials, StudentOption } from "./types";

export function useClassMembers(classId: string) {
  return useQuery({
    queryKey: ["classes", classId, "members"],
    queryFn: async () => (await api.get<ClassMember[]>(`/classes/${classId}/members`)).data,
  });
}

export function useCreateStudent(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (full_name: string) =>
      (await api.post<StudentCredentials>(`/classes/${classId}/students`, { full_name })).data,
    onSuccess: () => invalidate(qc, classId),
  });
}

export function useCreateStudentsBulk(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) =>
      (await api.post<StudentCredentials[]>(`/classes/${classId}/students/bulk`, { names })).data,
    onSuccess: () => invalidate(qc, classId),
  });
}

export function useResetPassword(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) =>
      (await api.post<StudentCredentials>(`/students/${studentId}/reset-password`)).data,
    onSuccess: () => invalidate(qc, classId),
  });
}

export function useSearchStudents(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "search", q],
    enabled,
    queryFn: async () =>
      (await api.get<StudentOption[]>("/students", { params: q ? { q } : {} })).data,
  });
}

export function useAddExistingMember(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) =>
      api.post(`/classes/${classId}/members`, { student_id: studentId }),
    onSuccess: () => invalidate(qc, classId),
  });
}

export function useAddExistingMembers(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentIds: string[]) => {
      for (const id of studentIds) {
        await api.post(`/classes/${classId}/members`, { student_id: id });
      }
    },
    onSuccess: () => invalidate(qc, classId),
  });
}

export function useRemoveMember(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) =>
      api.delete(`/classes/${classId}/members/${studentId}`),
    onSuccess: () => invalidate(qc, classId),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, classId: string) {
  qc.invalidateQueries({ queryKey: ["classes", classId, "members"] });
  qc.invalidateQueries({ queryKey: ["classes", classId] });
  qc.invalidateQueries({ queryKey: ["classes"] });
}

export async function downloadHandoutsPdf(
  classId: string,
  items: { full_name: string; username: string; password: string }[],
) {
  const payload = items.map(({ full_name, username, password }) => ({
    full_name,
    username,
    password,
  }));
  const res = await fetch(`/api/v1/classes/${classId}/handouts.pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenStore.access}`,
    },
    body: JSON.stringify({ items: payload }),
  });
  if (!res.ok) throw new Error("Не удалось сформировать PDF");
  const blob = await res.blob();
  triggerDownload(blob, "logins.pdf");
}

export function downloadCsv(
  items: { full_name: string; username: string; password: string }[],
) {
  const rows = [
    ["ФИО", "Логин", "Пароль"],
    ...items.map((i) => [i.full_name, i.username, i.password]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  triggerDownload(new Blob([csv], { type: "text/csv" }), "logins.csv");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
