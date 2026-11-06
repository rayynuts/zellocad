import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">That Zello CAD page is not available.</p>
        <Link href="/home" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-3 text-sm text-white">Back to servers</Link>
      </div>
    </main>
  );
}
