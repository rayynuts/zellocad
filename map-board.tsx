"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { createMarker, deleteMarker } from "@/lib/actions/cad";
import type { ActionState } from "@/lib/actions/types";
import { LOCATIONS } from "@/lib/constants";
import { CALL_STATUS_LABEL, PRIORITY_LABEL, UNIT_STATUS_LABEL } from "@/lib/constants";
import { Banner, Button, fieldClass, SubmitButton } from "./ui";

export type MapCall = {
  id: string;
  title: string;
  status: string;
  priority: string;
  location: string;
  description: string;
  posX: number;
  posY: number;
};

export type MapUnit = {
  id: string;
  callsign: string;
  status: string;
  posX: number;
  posY: number;
  color: string;
};

export type MapPin = {
  id: string;
  label: string;
  posX: number;
  posY: number;
  callId: string | null;
  callTitle: string | null;
};

const PRIORITY_FILL: Record<string, string> = {
  LOW: "#A4AEC0",
  MEDIUM: "#527DFF",
  HIGH: "#F0A84D",
  CRITICAL: "#F05B65",
};

export function MapBoard({
  serverId,
  calls,
  units,
  markers,
  canDispatch,
}: {
  serverId: string;
  calls: MapCall[];
  units: MapUnit[];
  markers: MapPin[];
  canDispatch: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const moved = useRef(false);
  const [placing, setPlacing] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<MapCall | MapPin | null>(null);
  const [state, action, pending] = useActionState(createMarker, {} as ActionState);
  const router = useRouter();

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((value) => Math.min(3.2, Math.max(0.65, value * (event.deltaY > 0 ? 0.92 : 1.08))));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (state.success) {
      setPoint(null);
      setPlacing(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0c1c28]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="mr-auto text-sm font-medium">Liberty County summer map</p>
        <button type="button" className="grid size-9 place-items-center rounded-lg bg-panel" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.65, value - 0.15))}><Minus size={16} /></button>
        <button type="button" className="grid size-9 place-items-center rounded-lg bg-panel" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(3.2, value + 0.15))}><Plus size={16} /></button>
        <button type="button" className="grid size-9 place-items-center rounded-lg bg-panel" aria-label="Reset map" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={16} /></button>
        {canDispatch ? (
          <Button type="button" variant={placing ? "ok" : "ghost"} onClick={() => { setPlacing((value) => !value); setPoint(null); }}>
            {placing ? "Click the map" : "Place marker"}
          </Button>
        ) : null}
      </div>
      <div
        ref={frame}
        className="relative h-[52vh] min-h-80 cursor-grab touch-none overflow-hidden active:cursor-grabbing md:h-[68vh]"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button, a, input, form, select, textarea")) return;
          moved.current = false;
          drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
          (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          if (Math.hypot(dx, dy) > 4) moved.current = true;
          setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }} className="h-full w-full">
          <svg
            viewBox="0 0 1200 760"
            className="h-full w-full"
            onClick={(event) => {
              if (!placing || moved.current) return;
              const svg = event.currentTarget;
              const pt = svg.createSVGPoint();
              pt.x = event.clientX;
              pt.y = event.clientY;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const mapped = pt.matrixTransform(ctm.inverse());
              setPoint({ x: Math.round(mapped.x), y: Math.round(mapped.y) });
            }}
          >
            <defs>
              <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1d6d90" />
                <stop offset="100%" stopColor="#0d3b52" />
              </linearGradient>
              <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f8d58" />
                <stop offset="100%" stopColor="#245636" />
              </linearGradient>
            </defs>
            <rect width="1200" height="760" fill="url(#water)" />
            <path d="M180 80c40-40 220-50 420-30 220 22 390 10 500 70 80 44 90 150 40 250-30 70 20 150-40 230-70 90-230 140-420 120-210-22-250-40-330-130-70-80-90-180-70-280 16-70 40-110 80-150z" fill="url(#land)" />
            <path d="M190 150c30 80 20 180 70 250 18 24 10 40-20 48-40 10-70-30-78-90-12-90 8-180 28-208z" fill="#e6c98a" opacity="0.9" />
            <path d="M250 470c80-20 140 10 180 50 30 30-10 90-80 100-90 12-160-40-170-90-6-28 20-48 70-60z" fill="#14597a" />
            <ellipse cx="980" cy="150" rx="90" ry="55" fill="#347a49" />
            <ellipse cx="430" cy="220" rx="70" ry="40" fill="#347a49" />
            <path d="M280 180 C 340 240, 360 360, 340 520" stroke="#f4f0e6" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M320 400 H 1080" stroke="#f7f4ee" strokeWidth="12" fill="none" />
            <path d="M700 90 V 680" stroke="#efeae0" strokeWidth="9" fill="none" />
            <path d="M520 250 H 900 M 560 330 H 940 M 620 470 H 1000" stroke="#e7e1d4" strokeWidth="6" fill="none" />
            <path d="M360 455 H 470" stroke="#d5dbe3" strokeWidth="14" />
            <path d="M650 150 H 760" stroke="#d5dbe3" strokeWidth="12" />
            <g fill="#d5dce8" stroke="#243044" strokeWidth="1">
              <rect x="690" y="210" width="46" height="34" />
              <rect x="750" y="250" width="70" height="48" />
              <rect x="830" y="280" width="54" height="40" />
              <rect x="620" y="360" width="50" height="36" />
              <rect x="900" y="500" width="60" height="32" />
              <rect x="1000" y="560" width="70" height="40" />
            </g>
            {LOCATIONS.map((place) => (
              <g key={place.name}>
                <circle cx={place.x} cy={place.y} r="4" fill="#f4f6fa" />
                <text x={place.x + 8} y={place.y - 8} fill="#f4f6fa" stroke="#102018" strokeWidth="3" paintOrder="stroke" fontSize="13">
                  {place.name}
                </text>
              </g>
            ))}
            {markers.map((marker) => (
              <g key={marker.id} onClick={(event) => { event.stopPropagation(); setSelected(marker); }} className="cursor-pointer">
                <rect x={marker.posX - 7} y={marker.posY - 7} width="14" height="14" transform={`rotate(45 ${marker.posX} ${marker.posY})`} fill="#A77BFF" stroke="white" />
              </g>
            ))}
            {calls.filter((call) => !["COMPLETED", "CANCELLED"].includes(call.status)).map((call) => (
              <g key={call.id} onClick={(event) => { event.stopPropagation(); setSelected(call); }} className="cursor-pointer">
                <circle cx={call.posX} cy={call.posY} r="16" fill={PRIORITY_FILL[call.priority] ?? "#527DFF"} stroke="white" strokeWidth="2" />
                <text x={call.posX} y={call.posY + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">!</text>
              </g>
            ))}
            {units.map((unit) => (
              <g key={unit.id}>
                <rect x={unit.posX - 28} y={unit.posY - 12} rx="6" width="56" height="20" fill="#10131B" stroke={unit.color} />
                <text x={unit.posX} y={unit.posY + 3} textAnchor="middle" fill="#F4F6FA" fontSize="10">{unit.callsign}</text>
              </g>
            ))}
            <text x="24" y="736" fill="#d5e6f2" fontSize="14">Fictional ERLC-inspired summer map placeholder — not an official map</text>
          </svg>
        </div>
        {selected ? (
          <aside className="absolute bottom-3 left-3 right-3 max-w-sm rounded-2xl border border-white/10 bg-card/95 p-3 text-sm shadow-xl md:right-auto">
            {"priority" in selected ? (
              <>
                <p className="font-semibold">{selected.title}</p>
                <p className="text-muted">{selected.location}</p>
                <p className="mt-1">{PRIORITY_LABEL[selected.priority]} · {CALL_STATUS_LABEL[selected.status]}</p>
                <p className="mt-1 text-muted">{selected.description || "No description."}</p>
                <a className="mt-2 inline-block text-accent" href={`/s/${serverId}/dispatch?call=${selected.id}`}>Open in dispatch</a>
              </>
            ) : (
              <>
                <p className="font-semibold">{selected.label}</p>
                <p className="text-muted">{selected.callTitle ? `Linked call: ${selected.callTitle}` : "Custom marker"}</p>
                {canDispatch ? (
                  <form action={deleteMarker} className="mt-2">
                    <input type="hidden" name="serverId" value={serverId} />
                    <input type="hidden" name="markerId" value={selected.id} />
                    <SubmitButton variant="danger">Remove marker</SubmitButton>
                  </form>
                ) : null}
              </>
            )}
            <button type="button" className="mt-2 text-xs text-muted" onClick={() => setSelected(null)}>Close</button>
          </aside>
        ) : null}
      </div>
      {point && canDispatch ? (
        <form action={action} className="grid gap-2 border-t border-white/10 p-3 md:grid-cols-[1fr_1fr_auto]">
          <Banner error={state.error} success={state.success} />
          <input type="hidden" name="serverId" value={serverId} />
          <input type="hidden" name="posX" value={point.x} />
          <input type="hidden" name="posY" value={point.y} />
          <input className={fieldClass} name="label" placeholder="Marker label" required minLength={2} />
          <select className={fieldClass} name="callId" defaultValue="">
            <option value="">No linked call</option>
            {calls.map((call) => <option key={call.id} value={call.id}>{call.title}</option>)}
          </select>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : `Place at ${point.x}, ${point.y}`}</Button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-3 px-3 py-2 text-xs text-muted">
        <span>Units: {units.map((unit) => `${unit.callsign} ${UNIT_STATUS_LABEL[unit.status] ?? unit.status}`).join(" · ") || "none"}</span>
      </div>
    </div>
  );
}
