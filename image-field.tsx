"use client";

import { useState } from "react";
import { fieldClass } from "./ui";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function ImageField({
  label,
  fileName,
  urlName,
  removeName,
  current,
  maxMb,
  hint,
  square = false,
}: {
  label: string;
  fileName: string;
  urlName: string;
  removeName: string;
  current?: string | null;
  maxMb: number;
  hint: string;
  square?: boolean;
}) {
  const [preview, setPreview] = useState(current || "");
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className={`overflow-hidden rounded-xl border border-white/10 bg-panel ${square ? "h-28 w-28" : "h-32 w-full"}`}>
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-accent/70 to-violet/70 text-xs font-medium text-white">
            Default image
          </div>
        )}
      </div>
      <input
        className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-panel file:px-3 file:py-2 file:text-ink"
        type="file"
        name={fileName}
        accept={TYPES.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!TYPES.includes(file.type)) {
            setError("Use a PNG, JPG, WEBP, or GIF.");
            event.target.value = "";
            return;
          }
          if (file.size > maxMb * 1024 * 1024) {
            setError(`File must be under ${maxMb} MB.`);
            event.target.value = "";
            return;
          }
          setError("");
          setPreview(URL.createObjectURL(file));
        }}
      />
      <input
        className={fieldClass}
        name={urlName}
        placeholder="or paste an image URL"
        onChange={(event) => {
          const value = event.target.value.trim();
          if (!value) return;
          if (!/^https?:\/\//i.test(value)) {
            setError("Image URL must start with http:// or https://.");
            return;
          }
          setError("");
          setPreview(value);
        }}
      />
      {current ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name={removeName} className="size-4 accent-[#527DFF]" />
          Remove current image
        </label>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
