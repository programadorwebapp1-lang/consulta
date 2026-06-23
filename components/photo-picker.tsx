"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

type Props = {
  label: string;
  currentUrl?: string;
  name?: string;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  maxSizeMB?: number;
  helperText?: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getInitials(name?: string) {
  if (!name) return "MD";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MD";
}

export function PhotoPicker({ label, currentUrl = "", name, onFileChange, onRemove, maxSizeMB = 5, helperText }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const maxBytes = maxSizeMB * 1024 * 1024;

  useEffect(() => {
    setError("");
    if (previewRef.current.startsWith("blob:") && previewRef.current !== currentUrl) {
      URL.revokeObjectURL(previewRef.current);
    }
    setPreviewUrl(currentUrl);
    previewRef.current = currentUrl;
  }, [currentUrl]);

  const initials = useMemo(() => getInitials(name), [name]);

  async function handleFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use apenas JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`A imagem deve ter no máximo ${maxSizeMB} MB.`);
      return;
    }

    if (previewRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(previewRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    onFileChange(file);
  }

  useEffect(() => {
    return () => {
      if (previewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, [previewUrl]);

  function clearPhoto() {
    setError("");
    if (previewRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = "";
    setPreviewUrl("");
    onFileChange(null);
    onRemove();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-md active:translate-y-0"
          >
            <Upload className="w-4 h-4" />
            Enviar foto
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={clearPhoto}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md active:translate-y-0"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-500 text-lg font-bold text-white">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">Pré-visualização</p>
          <p className="text-xs text-slate-500">
            Arquivo permitido: JPG, PNG ou WEBP. Máximo de {maxSizeMB} MB.
          </p>
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
