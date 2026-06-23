"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/system-ui";
import { PhotoPicker } from "@/components/photo-picker";
import { fireSwal } from "@/lib/swal";

type Props = {
  initialSettings: Record<string, any>;
  onSaved?: (settings: Record<string, any>) => void;
};

type LocalState = {
  clinicName: string;
  cnpj: string;
  logoUrl: string;
  bannerUrl: string;
  description: string;
  address: string;
  googleMapsUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  openingHours: string;
  galleryImages: string[];
  showPricesPublicly: boolean;
};

const EMPTY_STATE: LocalState = {
  clinicName: "",
  cnpj: "",
  logoUrl: "",
  bannerUrl: "",
  description: "",
  address: "",
  googleMapsUrl: "",
  phone: "",
  whatsapp: "",
  email: "",
  openingHours: "",
  galleryImages: [],
  showPricesPublicly: true,
};

export function PublicSettingsForm({ initialSettings, onSaved }: Props) {
  const [form, setForm] = useState<LocalState>(EMPTY_STATE);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [removedGalleryImages, setRemovedGalleryImages] = useState<string[]>([]);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);

  useEffect(() => {
    setForm({
      clinicName: initialSettings?.clinicName || "",
      cnpj: initialSettings?.cnpj || "",
      logoUrl: initialSettings?.logoUrl || "",
      bannerUrl: initialSettings?.bannerUrl || "",
      description: initialSettings?.description || "",
      address: initialSettings?.address || "",
      googleMapsUrl: initialSettings?.googleMapsUrl || "",
      phone: initialSettings?.phone || "",
      whatsapp: initialSettings?.whatsapp || "",
      email: initialSettings?.email || "",
      openingHours: initialSettings?.openingHours || "",
      galleryImages: initialSettings?.galleryImages || [],
      showPricesPublicly: initialSettings?.showPricesPublicly ?? true,
    });
    setLogoFile(null);
    setBannerFile(null);
    setGalleryFiles([]);
    setRemovedGalleryImages([]);
    setRemoveLogo(false);
    setRemoveBanner(false);
  }, [initialSettings]);

  async function saveSettings() {
    setSaving(true);
    const payload = new FormData();
    payload.append("clinicName", form.clinicName);
    payload.append("cnpj", form.cnpj);
    payload.append("description", form.description);
    payload.append("address", form.address);
    payload.append("googleMapsUrl", form.googleMapsUrl);
    payload.append("phone", form.phone);
    payload.append("whatsapp", form.whatsapp);
    payload.append("email", form.email);
    payload.append("openingHours", form.openingHours);
    payload.append("galleryImages", JSON.stringify(form.galleryImages));
    payload.append("removedGalleryImages", JSON.stringify(removedGalleryImages));
    payload.append("showPricesPublicly", String(form.showPricesPublicly));
    payload.append("removeLogo", String(removeLogo));
    payload.append("removeBanner", String(removeBanner));

    if (logoFile) payload.append("logoFile", logoFile);
    if (bannerFile) payload.append("bannerFile", bannerFile);
    for (const file of galleryFiles) {
      payload.append("galleryFiles", file);
    }

    const response = await fetch("/api/clinic-settings", {
      method: "PUT",
      body: payload,
    });

    const json = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Erro ao salvar configurações.",
      });
      return;
    }

    await fireSwal({
      icon: "success",
      title: "Concluído",
      text: "Configurações salvas com sucesso.",
    });

    onSaved?.(json.clinicSettings || form);
    setLogoFile(null);
    setBannerFile(null);
    setGalleryFiles([]);
    setRemovedGalleryImages([]);
    setRemoveLogo(false);
    setRemoveBanner(false);
  }

  async function removeGalleryImage(url: string) {
    const result = await fireSwal({
      icon: "warning",
      title: "Remover imagem?",
      text: "A imagem será excluída da galeria pública.",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    setForm((current) => ({
      ...current,
      galleryImages: current.galleryImages.filter((item) => item !== url),
    }));
    setRemovedGalleryImages((current) => [...current, url]);
    await fireSwal({
      icon: "success",
      title: "Removida",
      text: "Imagem marcada para remoção com sucesso.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Dados públicos da clínica</h3>
              <p className="text-sm text-slate-500">Tudo que aparece na página inicial pública.</p>
            </div>
            <Button variant="secondary" onClick={saveSettings} disabled={saving}>
              <RefreshCw className="h-4 w-4" />
              Salvar
            </Button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome da clínica</span>
            <Input value={form.clinicName} onChange={(e) => setForm((curr) => ({ ...curr, clinicName: e.target.value }))} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">CNPJ</span>
            <Input value={form.cnpj} onChange={(e) => setForm((curr) => ({ ...curr, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Telefone</span>
              <Input value={form.phone} onChange={(e) => setForm((curr) => ({ ...curr, phone: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">WhatsApp</span>
              <Input value={form.whatsapp} onChange={(e) => setForm((curr) => ({ ...curr, whatsapp: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <Input value={form.email} onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Horário de funcionamento</span>
              <Input value={form.openingHours} onChange={(e) => setForm((curr) => ({ ...curr, openingHours: e.target.value }))} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Endereço</span>
            <Textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm((curr) => ({ ...curr, address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade e estado"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Link do Google Maps</span>
            <Input value={form.googleMapsUrl} onChange={(e) => setForm((curr) => ({ ...curr, googleMapsUrl: e.target.value }))} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Texto de apresentação</span>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm((curr) => ({ ...curr, description: e.target.value }))}
              placeholder="Texto principal exibido no banner da página pública"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.showPricesPublicly}
              onChange={(e) => setForm((curr) => ({ ...curr, showPricesPublicly: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">Mostrar preços publicamente</p>
              <p className="text-xs text-slate-500">Se desligado, a página pública mostra apenas "Preço sob consulta".</p>
            </div>
          </label>
        </Card>

        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Identidade visual</h3>
            <p className="text-sm text-slate-500">Logo e banner principal armazenados no Cloudinary.</p>
          </div>

          <PhotoPicker
            label="Logo da clínica"
            name={form.clinicName}
            currentUrl={removeLogo ? "" : form.logoUrl}
            onFileChange={(file) => {
              setLogoFile(file);
              setRemoveLogo(false);
            }}
            onRemove={() => {
              setLogoFile(null);
              setRemoveLogo(true);
            }}
            helperText="A logo aparece no topo da landing page."
          />

          <PhotoPicker
            label="Banner principal"
            name={form.clinicName}
            currentUrl={removeBanner ? "" : form.bannerUrl}
            onFileChange={(file) => {
              setBannerFile(file);
              setRemoveBanner(false);
            }}
            onRemove={() => {
              setBannerFile(null);
              setRemoveBanner(true);
            }}
            helperText="Imagem grande usada no hero da página pública."
          />
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Galeria do consultório</h3>
            <p className="text-sm text-slate-500">Adicione fotos da recepção, salas, fachada e ambientes.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
            <Upload className="h-4 w-4" />
            Adicionar imagens
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const nextFiles = Array.from(e.target.files || []);
                setGalleryFiles((current) => current.concat(nextFiles));
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {galleryFiles.length > 0 && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {galleryFiles.length} imagem(ns) nova(s) pronta(s) para envio.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {form.galleryImages.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Nenhuma imagem cadastrada ainda.
            </div>
          ) : (
            form.galleryImages.map((url) => (
              <div key={url} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-56 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Galeria do consultório" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="truncate text-sm text-slate-600">Imagem da galeria</p>
                  <Button variant="ghost" size="sm" onClick={() => removeGalleryImage(url)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
