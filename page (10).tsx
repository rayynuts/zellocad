import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/home");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6"><Logo /></Link>
      <h1 className="mb-4 text-2xl font-semibold">Create your Zello CAD account</h1>
      <RegisterForm />
      <p className="mt-4 text-sm text-muted">Already registered? <Link className="text-accent" href="/login">Sign in</Link></p>
    </main>
  );
}
