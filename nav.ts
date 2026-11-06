import { redirect } from "next/navigation";

export function bounce(path: string, error: string): never {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("error", error);
  params.delete("notice");
  redirect(`${base}?${params.toString()}`);
}

export function done(path: string, notice: string): never {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("notice", notice);
  params.delete("error");
  redirect(`${base}?${params.toString()}`);
}
