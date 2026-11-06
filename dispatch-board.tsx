"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_CATEGORIES, CALL_PRIORITIES, CALL_STATUSES, CALL_STATUS_LABEL, LOCATIONS, PRIORITY_LABEL } from "@/lib/constants";
import { createCall, updateCall } from "@/lib/actions/cad";
import type { ActionState } from "@/lib/actions/types";
import { formatWhen } from "@/lib/format";
import { Banner, Button, fieldClass, SubmitButton } from "./ui";

export type DispatchCall = {
  id: string;
  title: string;
  category: string;
  priority: string;
  location: string;
  description: string;
  status: string;
  notes: string;
  createdAt: string;
  unitIds: string[];
};

export type DispatchUnit = { id: string; callsign: string; displayName: string; status: string };

export function DispatchBoard({
  serverId,
  calls,
  units,
  initialCallId,
}: {
  serverId: string;
  calls: DispatchCall[];
  units: DispatchUnit[];
  initialCallId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialCallId || calls[0]?.id || "");
  const selected = calls.find((call) => call.id === selectedId) ?? calls[0] ?? null;
  const [state, action, pending] = useActionState(createCall, {} as ActionState);
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <section className="space-y-2 rounded-2xl border border-white/5 bg-card p-3">
        <h2 className="px-1 text-sm font-semibold">Active calls</h2>
        {calls.length === 0 ? <p className="px-1 text-sm text-muted">No open calls.</p> : null}
        {calls.map((call) => (
          <button key={call.id} type="button" onClick={() => setSelectedId(call.id)} className={`block w-full rounded-xl px-3 py-2 text-left ${selected?.id === call.id ? "bg-accent text-white" : "bg-panel hover:bg-[#31405c]"}`}>
            <span className="block text-sm font-medium">{call.title}</span>
            <span className={`block text-xs ${selectedId === call.id ? "text-white/80" : "text-muted"}`}>{PRIORITY_LABEL[call.priority]} · {CALL_STATUS_LABEL[call.status]}</span>
          </button>
        ))}
      </section>
      <section className="rounded-2xl border border-white/5 bg-card p-4">
        {selected ? (
          <form action={updateCall} className="space-y-3" key={selected.id}>
            <input type="hidden" name="serverId" value={serverId} />
            <input type="hidden" name="callId" value={selected.id} />
            <p className="text-xs text-muted">Opened {formatWhen(selected.createdAt)}</p>
            <input className={fieldClass} name="title" defaultValue={selected.title} required />
            <div className="grid gap-3 md:grid-cols-2">
              <select className={fieldClass} name="category" defaultValue={selected.category}>{CALL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
              <select className={fieldClass} name="priority" defaultValue={selected.priority}>{CALL_PRIORITIES.map((item) => <option key={item} value={item}>{PRIORITY_LABEL[item]}</option>)}</select>
              <select className={fieldClass} name="location" defaultValue={selected.location}>{LOCATIONS.map((item) => <option key={item.name}>{item.name}</option>)}{LOCATIONS.some((item) => item.name === selected.location) ? null : <option>{selected.location}</option>}</select>
              <select className={fieldClass} name="status" defaultValue={selected.status}>{CALL_STATUSES.map((item) => <option key={item} value={item}>{CALL_STATUS_LABEL[item]}</option>)}</select>
            </div>
            <textarea className={`${fieldClass} min-h-24`} name="description" defaultValue={selected.description} placeholder="Call description" />
            <textarea className={`${fieldClass} min-h-24`} name="notes" defaultValue={selected.notes} placeholder="Dispatch notes" />
            <fieldset className="space-y-1 rounded-xl bg-panel p-3">
              <legend className="px-1 text-sm">Assigned units</legend>
              {units.length === 0 ? <p className="text-sm text-muted">No units on this server.</p> : null}
              {units.map((unit) => (
                <label key={unit.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="unitId" value={unit.id} defaultChecked={selected.unitIds.includes(unit.id)} />
                  {unit.callsign} · {unit.displayName}
                </label>
              ))}
            </fieldset>
            <SubmitButton pendingLabel="Saving...">Save call</SubmitButton>
          </form>
        ) : <p className="text-sm text-muted">Select a call or create one.</p>}
      </section>
      <section className="rounded-2xl border border-white/5 bg-card p-4">
        <h2 className="mb-3 font-semibold">New call</h2>
        <form action={action} className="space-y-3">
          <Banner error={state.error} success={state.success} />
          <input type="hidden" name="serverId" value={serverId} />
          <input className={fieldClass} name="title" placeholder="Call title" required minLength={3} />
          <select className={fieldClass} name="category" defaultValue={CALL_CATEGORIES[0]}>{CALL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={fieldClass} name="priority" defaultValue="MEDIUM">{CALL_PRIORITIES.map((item) => <option key={item} value={item}>{PRIORITY_LABEL[item]}</option>)}</select>
          <select className={fieldClass} name="location" defaultValue={LOCATIONS[0].name}>{LOCATIONS.map((item) => <option key={item.name}>{item.name}</option>)}</select>
          <textarea className={`${fieldClass} min-h-24`} name="description" placeholder="What is happening?" />
          <textarea className={`${fieldClass} min-h-20`} name="notes" placeholder="Dispatch notes" />
          <fieldset className="max-h-40 space-y-1 overflow-auto rounded-xl bg-panel p-3">
            <legend className="px-1 text-sm">Assign units</legend>
            {units.map((unit) => (
              <label key={unit.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="unitId" value={unit.id} /> {unit.callsign}
              </label>
            ))}
          </fieldset>
          <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create call"}</Button>
        </form>
      </section>
    </div>
  );
}
