"use client";

export default function ErrorScreen({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">{error.message || "Zello CAD could not complete that request."}</p>
        <button type="button" className="mt-4 h-10 rounded-xl bg-accent px-3 text-sm text-white" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
