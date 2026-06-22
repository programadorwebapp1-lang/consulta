"use client";

import Image from "next/image";
import { LogOut, Menu, Stethoscope, X } from "lucide-react";
import { useState, type ElementType, type ReactNode } from "react";

type NavItem = { id: string; label: string; icon: ElementType };

export function RoleShell({
  userName,
  roleLabel,
  clinicName = "MediClinic",
  clinicLogoUrl = "",
  navItems,
  active,
  onNavigate,
  onLogout,
  children,
}: {
  userName: string;
  roleLabel: string;
  clinicName?: string;
  clinicLogoUrl?: string;
  navItems: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="md:hidden fixed top-0 inset-x-0 z-50 h-16 px-4 flex items-center justify-between border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {clinicLogoUrl ? (
              <Image src={clinicLogoUrl} alt={clinicName} width={32} height={32} className="h-full w-full object-cover" />
            ) : (
              <Stethoscope className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-none truncate">{clinicName}</p>
            <p className="text-[11px] text-slate-500 truncate">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 bg-white"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 bg-white"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          className="md:hidden fixed inset-0 z-40 bg-slate-950/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full flex flex-col bg-slate-900 transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-16" : "md:w-64"} w-64`}
      >
        <div className="hidden md:flex items-center justify-between px-4 py-4 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center overflow-hidden">
                {clinicLogoUrl ? (
                  <Image src={clinicLogoUrl} alt={clinicName} width={32} height={32} className="h-full w-full object-cover" />
                ) : (
                  <Stethoscope className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="font-bold text-white text-sm truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {clinicName}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center overflow-hidden">
              {clinicLogoUrl ? (
                <Image src={clinicLogoUrl} alt={clinicName} width={32} height={32} className="h-full w-full object-cover" />
              ) : (
                <Stethoscope className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="font-bold text-white text-sm truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {clinicName}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  collapsed ? "justify-center md:justify-center" : ""
                } ${selected ? "bg-sky-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className={`${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          {collapsed ? (
            <button
              onClick={onLogout}
              title="Sair"
              className="w-full flex justify-center p-2.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{userName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <button
                onClick={onLogout}
                title="Sair"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className={`pt-16 md:pt-0 overflow-y-auto transition-all duration-300 ${collapsed ? "md:ml-16" : "md:ml-64"}`}>
        <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full min-h-full">{children}</div>
      </main>
    </div>
  );
}
