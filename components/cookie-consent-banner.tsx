"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Settings2 } from "lucide-react";
import Link from "next/link";
import { Button, Card, Modal } from "@/components/system-ui";

type CookiePreferences = {
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "mediclinic:cookie-consent";

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const PUBLIC_PATHS = ["/", "/login", "/cadastro", "/termos", "/privacidade", "/cookies"];

function loadPreferences() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      essential: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    } satisfies CookiePreferences;
  } catch {
    return null;
  }
}

function savePreferences(preferences: CookiePreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFS);

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const shouldRender = useMemo(() => PUBLIC_PATHS.includes(path), [path]);

  useEffect(() => {
    const stored = loadPreferences();
    if (!stored) {
      setVisible(true);
    } else {
      setPreferences(stored);
    }
    setReady(true);
  }, []);

  if (!ready || !shouldRender || !visible) return null;

  function acceptAll() {
    const nextPrefs: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(nextPrefs);
    savePreferences(nextPrefs);
    setVisible(false);
    setShowSettings(false);
  }

  function acceptEssentials() {
    const nextPrefs: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(nextPrefs);
    savePreferences(nextPrefs);
    setVisible(false);
    setShowSettings(false);
  }

  function saveCustomPreferences() {
    const nextPrefs: CookiePreferences = {
      essential: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    };
    setPreferences(nextPrefs);
    savePreferences(nextPrefs);
    setVisible(false);
    setShowSettings(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
        <Card className="mx-auto max-w-4xl overflow-hidden border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Privacidade e cookies</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Usamos cookies essenciais para login, segurança e funcionamento do sistema. Cookies funcionais
                  podem lembrar preferências, e qualquer categoria adicional depende do seu consentimento.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <Link href="/cookies" className="font-medium text-sky-700 hover:text-sky-800">
                    Gerenciar cookies
                  </Link>
                  <Link href="/termos" className="font-medium text-slate-600 hover:text-slate-900">
                    Termos de uso
                  </Link>
                  <Link href="/privacidade" className="font-medium text-slate-600 hover:text-slate-900">
                    Política de privacidade
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => setShowSettings(true)}>
                <Settings2 className="h-4 w-4" />
                Configurar
              </Button>
              <Button variant="secondary" onClick={acceptEssentials}>
                Apenas essenciais
              </Button>
              <Button onClick={acceptAll}>Aceitar tudo</Button>
            </div>
          </div>
        </Card>
      </div>

      {showSettings && (
        <Modal title="Gerenciar cookies" onClose={() => setShowSettings(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Essenciais</p>
              <p className="mt-1 text-sm text-slate-600">
                Necessários para autenticação, navegação segura e funcionamento básico do sistema.
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-700">Sempre ativos</p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences((curr) => ({ ...curr, functional: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Funcionais</span>
                <span className="block text-sm text-slate-600">
                  Lembram preferências como e-mail salvo e pequenas conveniências de uso.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((curr) => ({ ...curr, analytics: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Analíticos</span>
                <span className="block text-sm text-slate-600">
                  Ajudam a entender uso e melhorar a experiência. Só serão usados se você permitir.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences((curr) => ({ ...curr, marketing: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Marketing</span>
                <span className="block text-sm text-slate-600">
                  Não são usados por padrão. Se existir campanha futura, será solicitado consentimento.
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={acceptEssentials}>
                Salvar apenas essenciais
              </Button>
              <Button onClick={saveCustomPreferences}>Salvar preferências</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
