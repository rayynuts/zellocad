import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login" className="inline-flex h-10 items-center rounded-xl bg-panel px-3 text-sm">Sign in</Link>
          <Link href="/register" className="inline-flex h-10 items-center rounded-xl bg-accent px-3 text-sm text-white">Create account</Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-medium text-accent">Emergency Response: Liberty County</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">Dispatch for roleplay communities, under one original CAD.</h1>
          <p className="mt-4 max-w-xl text-muted">Zello CAD gives each community its own server, departments, invitations, and a fictional summer county map for calls, units, and radio traffic.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex h-11 items-center rounded-xl bg-accent px-4 font-medium text-white">Open a console</Link>
            <Link href="/login" className="inline-flex h-11 items-center rounded-xl bg-panel px-4">I already have an account</Link>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ["Servers that stay separate", "Members, calls, departments, and logs never cross between communities."],
            ["Public or private access", "Discovery is only for public servers. Private ones stay invitation-only."],
            ["A dispatch floor", "Calls, units, BOLOs, reports, and radio live beside the county map."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/5 bg-card p-4">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
