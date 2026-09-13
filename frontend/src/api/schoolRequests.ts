import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface SchoolRequestPayload {
  school_name: string;
  city: string;
  region?: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  comment?: string;
  website?: string;
}

export function useCreateSchoolRequest() {
  return useMutation({
    mutationFn: async (data: SchoolRequestPayload) =>
      (await api.post<{ detail: string }>("/school-requests", data)).data,
  });
}
