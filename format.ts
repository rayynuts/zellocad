export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatWhen(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function serverRoleLabel(role: string) {
  switch (role) {
    case "OWNER":
      return "Server Owner";
    case "ADMINISTRATOR":
      return "Server Administrator";
    case "MEMBER":
      return "Member";
    case "GUEST":
      return "Guest";
    default:
      return role;
  }
}

export function deptRoleLabel(role: string) {
  switch (role) {
    case "DIRECTOR":
      return "Department Director";
    case "SUPERVISOR":
      return "Department Supervisor";
    case "MEMBER":
      return "Department Member";
    default:
      return role;
  }
}

export function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "item";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "Z";
}

export function safePath(input: string, fallback: string) {
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) return fallback;
  return input;
}
