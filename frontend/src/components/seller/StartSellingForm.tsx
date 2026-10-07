"use client";

import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api-client";
import type { Store } from "@/types/api";

export const NAME_MIN = 3;
export const NAME_MAX = 60;
export const DESC_MAX = 280;

export function validateStore(name: string, description: string): { name?: string; description?: string } {
  const e: { name?: string; description?: string } = {};
  const n = name.trim().replace(/\s+/g, " ");
  if (n.length < NAME_MIN || n.length > NAME_MAX) e.name = `Store name must be ${NAME_MIN} to ${NAME_MAX} characters.`;
  if (!description.trim()) e.description = "Add a short description of your store.";
  else if (description.trim().length > DESC_MAX) e.description = `Keep it to ${DESC_MAX} characters or fewer.`;
  return e;
}

export const sellerInput = (bad: boolean) =>
  `block w-full rounded-control border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 ${
    bad ? "border-danger" : "border-line"
  }`;

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

export function StartSellingForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateStore(name, description);
    setErrors(found);
    setFormError(null);
    if (found.name || found.description) return;
    setBusy(true);
    try {
      await api<Store>("/seller/store", { method: "POST", body: { store_name: name, description } });
      await refreshUser();
      router.replace("/seller");
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError && (
        <p role="alert" className="rounded-control bg-deal-soft p-3 text-sm font-semibold text-deal">
          {formError}
        </p>
      )}
      <div>
        <label htmlFor="store-name" className="mb-1.5 block text-sm font-bold">
          Store name
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX + 10}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "store-name-error" : "store-name-hint"}
          className={`${sellerInput(!!errors.name)} h-12`}
          placeholder="e.g. Harbor Street Audio"
        />
        {errors.name ? (
          <FieldError id="store-name-error" message={errors.name} />
        ) : (
          <p id="store-name-hint" className="mt-1.5 text-sm text-ink-muted">
            Shown on your products as &ldquo;Sold by&rdquo;. {NAME_MIN}-{NAME_MAX} characters, must be unique.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="store-desc" className="mb-1.5 block text-sm font-bold">
          Short description
        </label>
        <textarea
          id="store-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "store-desc-error" : "store-desc-count"}
          className={`${sellerInput(!!errors.description)} py-3`}
          placeholder="What do you sell, and why should people buy from you?"
        />
        <div className="flex justify-between gap-2">
          <FieldError id="store-desc-error" message={errors.description} />
          <p
            id="store-desc-count"
            className={`mt-1.5 ml-auto text-xs tabular-nums ${description.length > DESC_MAX ? "font-bold text-danger" : "text-ink-muted"}`}
          >
            {description.length}/{DESC_MAX}
          </p>
        </div>
      </div>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full sm:w-auto">
        Create my store
      </Button>
    </form>
  );
}
