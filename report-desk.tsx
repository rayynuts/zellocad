"use client";

import { useActionState, useState } from "react";
import { saveReport } from "@/lib/actions/cad";
import type { ActionState } from "@/lib/actions/types";
import { formatWhen } from "@/lib/format";
import { Banner, Button, fieldClass } from "./ui";

type ReportItem = { id: string; title: string; body: string; createdAt: string; author: string; canEdit: boolean };

export function ReportDesk({ serverId, reports, canCreate = true }: { serverId: string; reports: ReportItem[]; canCreate?: boolean }) {
  const [editing, setEditing] = useState<ReportItem | null>(null);
  const [state, action, pending] = useActionState(saveReport, {} as ActionState);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        {reports.length === 0 ? <p className="text-sm text-muted">No reports yet.</p> : null}
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-white/5 bg-card p-4">
            <h2 className="font-semibold">{report.title}</h2>
            <p className="text-xs text-muted">{report.author} · {formatWhen(report.createdAt)}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{report.body}</p>
            {report.canEdit ? <button type="button" className="mt-2 text-sm text-accent" onClick={() => setEditing(report)}>Edit</button> : null}
          </article>
        ))}
      </div>
      {canCreate || editing ? <form action={action} className="space-y-3 rounded-2xl border border-white/5 bg-card p-4" key={editing?.id ?? "new"}>
        <h2 className="font-semibold">{editing ? "Edit report" : "New report"}</h2>
        <Banner error={state.error} success={state.success} />
        <input type="hidden" name="serverId" value={serverId} />
        {editing ? <input type="hidden" name="reportId" value={editing.id} /> : null}
        <input className={fieldClass} name="title" placeholder="Title" defaultValue={editing?.title ?? ""} required />
        <textarea className={`${fieldClass} min-h-40`} name="body" placeholder="Fictional incident narrative" defaultValue={editing?.body ?? ""} required />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update report" : "File report"}</Button>
          {editing ? <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button> : null}
        </div>
      </form> : null}
    </div>
  );
}
