"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/system-ui";

type PasswordInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function PasswordInput({ label, value, onChange, placeholder, required, className }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pr-11"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
          onClick={() => setVisible((curr) => !curr)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}
