"use client";

import { Store as StoreIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api-client";
import type { Store } from "@/types/api";

import { isImageUrl } from "./ImagesField";
import { DESC_MAX, FieldError, NAME_MAX, NAME_MIN, sellerInput, validateStore } from "./StartSellingForm";

export function StoreSettingsForm({ store }: { store: Store }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState(store.store_name);
  const [description, setDescription] = useState(store.description);
  const [logo, setLogo] = useState(store.logo_url ?? "");
  const [errors, setErrors] = useState<{ name?: string; description?: string; logo?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoOk = logo.trim() !== "" && isImageUrl(logo.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = validateStore(name, description);
    if (logo.trim() && !isImageUrl(logo.trim())) found.logo = "Use an image URL that starts with https://";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api<Store>("/seller/store", {
        method: "PATCH",
        body: { store_name: name, description, logo_url: logo.trim() || null },
      });
      await refreshUser();
      notify({ kind: "success", message: "Store updated. \"Sold by\" lines show the new name now." });
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6 rounded-card bg-surface p-5 shadow-card sm:p-6">
      {formError && (
        <p role="alert" className="rounded-control bg-deal-soft p-3 text-sm font-semibold text-deal">
          {formError}
        </p>
      )}
      <div>
        <label htmlFor="settings-name" className="mb-1.5 block text-sm font-bold">
          Store name
        </label>
        <input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="settings-name-error" className={`${sellerInput(!!errors.name)} h-12`} />
        {errors.name ? (
          <FieldError id="settings-name-error" message={errors.name} />
        ) : (
          <p className="mt-1.5 text-sm text-ink-muted">
            {NAME_MIN}-{NAME_MAX} characters, must be unique.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="settings-desc" className="mb-1.5 block text-sm font-bold">
          Description
        </label>
        <textarea id="settings-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} aria-invalid={!!errors.description} aria-describedby="settings-desc-error" className={`${sellerInput(!!errors.description)} py-3`} />
        <div className="flex justify-between gap-2">
          <FieldError id="settings-desc-error" message={errors.description} />
          <p className={`mt-1.5 ml-auto text-xs tabular-nums ${description.length > DESC_MAX ? "font-bold text-danger" : "text-ink-muted"}`}>
            {description.length}/{DESC_MAX}
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="settings-logo" className="mb-1.5 block text-sm font-bold">
          Logo image URL (optional)
        </label>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <input id="settings-logo" type="url" inputMode="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." aria-invalid={!!errors.logo} aria-describedby="settings-logo-error" className={`${sellerInput(!!errors.logo)} h-12`} />
            <FieldError id="settings-logo-error" message={errors.logo} />
          </div>
          {logoOk ? (
            <ProductImage src={logo.trim()} alt="Logo preview" sizes="64px" fit="contain" className="size-16 shrink-0 rounded-control border border-line" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-control bg-seller-soft text-seller" aria-hidden="true">
              <StoreIcon className="size-7" />
            </span>
          )}
        </div>
      </div>
      <Button type="submit" variant="seller" size="lg" loading={busy}>
        Save changes
      </Button>
    </form>
  );
}
