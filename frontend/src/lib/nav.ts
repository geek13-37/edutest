import type { Role } from "@/api/types";

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/app";
}

/**
 * Безопасный внутренний путь для редиректа после входа.
 * Пропускает только относительные пути этого же origin: начинается с одного "/",
 * без "//" и обхода через бэкслеш, без управляющих символов.
 * Для всего остального (http://, javascript:, //evil, /\evil) возвращает fallback.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  let path = next;
  try {
    path = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (path[0] !== "/") return fallback;
  if (path[1] === "/" || path[1] === "\\") return fallback;
  if (path.includes("\\")) return fallback;
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) < 0x20) return fallback;
  }
  return path;
}
