import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { tokenStore } from "@/lib/tokens";
import type {
  AdminUser,
  Analytics,
  AuditList,
  SchoolAdmin,
  SchoolScope,
  Stats,
  TeacherAdmin,
  TeacherCredentials,
} from "./types";

export function useStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get<Stats>("/admin/stats")).data,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => (await api.get<Analytics>("/admin/analytics")).data,
  });
}

export function useAuditLog(filters: { action?: string; target_type?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: async () =>
      (
        await api.get<AuditList>("/admin/audit", {
          params: {
            limit: filters.limit,
            offset: filters.offset,
            ...(filters.action ? { action: filters.action } : {}),
            ...(filters.target_type ? { target_type: filters.target_type } : {}),
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
}

export function useAdminSchools(scope: SchoolScope = "active") {
  return useQuery({
    queryKey: ["admin", "schools", scope],
    queryFn: async () =>
      (await api.get<SchoolAdmin[]>("/admin/schools", { params: { scope } })).data,
  });
}

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; city: string; region?: string }) =>
      (await api.post<SchoolAdmin>("/admin/schools", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "schools"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; city?: string; region?: string }) =>
      (await api.patch<SchoolAdmin>(`/admin/schools/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "schools"] }),
  });
}

export function useRegenerateSchoolCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<SchoolAdmin>(`/admin/schools/${id}/regenerate-code`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "schools"] }),
  });
}

export function useArchiveSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<SchoolAdmin>(`/admin/schools/${id}/archive`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "schools"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}

export function useRestoreSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<SchoolAdmin>(`/admin/schools/${id}/restore`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "schools"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}

/** Безвозвратное удаление; на бэкенде разрешено только для архивных школ. */
export function useDeleteSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/schools/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "schools"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export async function downloadSchoolExport(id: string, name: string) {
  const res = await fetch(`/api/v1/admin/schools/${id}/export.xlsx`, {
    headers: { Authorization: `Bearer ${tokenStore.access}` },
  });
  if (!res.ok) throw new Error("Не удалось сформировать выгрузку");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = name.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "school";
  a.download = `${safe}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useAdminTeachers(schoolId?: string) {
  return useQuery({
    queryKey: ["admin", "teachers", schoolId ?? "all"],
    queryFn: async () =>
      (await api.get<TeacherAdmin[]>("/admin/teachers", { params: schoolId ? { school_id: schoolId } : {} })).data,
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { full_name: string; email: string; school_id: string }) =>
      (await api.post<TeacherCredentials>("/admin/teachers", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
      qc.invalidateQueries({ queryKey: ["admin", "schools"] });
    },
  });
}

export function useSetTeacherActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      (await api.patch<TeacherAdmin>(`/admin/teachers/${id}/active`, { is_active })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teachers"] }),
  });
}

export function useResetTeacherPassword() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<TeacherCredentials>(`/admin/teachers/${id}/reset-password`)).data,
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ["admin", "admins"],
    queryFn: async () => (await api.get<AdminUser[]>("/admin/admins")).data,
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { full_name: string; email: string; password: string }) =>
      (await api.post<AdminUser>("/admin/admins", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admins"] }),
  });
}
