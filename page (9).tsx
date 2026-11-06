import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/home");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6"><Logo /></Link>
      <h1 className="mb-4 text-2xl font-semibold">Sign in to Zello CAD</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-muted">New here? <Link className="text-accent" href="/register">Create an account</Link></p>
    </main>
  );
}
