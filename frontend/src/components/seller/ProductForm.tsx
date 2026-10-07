"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api-client";
import type { Brand, Category, SellerProduct } from "@/types/api";

import { BadgesField } from "./BadgesField";
import { ImagesField, isImageUrl } from "./ImagesField";
import { FieldError, sellerInput } from "./StartSellingForm";
import { VariantsField, type VariantDraft } from "./VariantsField";

type Errors = Partial<Record<"title" | "brand" | "category" | "price" | "list" | "stock" | "images" | "variants", string>>;

const toCents = (v: string): number | null => {
  const s = v.trim().replace(/[$,]/g, "");
  if (!s || !/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
};
const toDollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));

function Field({ id, label, hint, error, children, className = "" }: { id: string; label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : hint && <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product?: SellerProduct;
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product ? String(product.category_id) : "");
  const [price, setPrice] = useState(toDollars(product?.price_cents));
  const [listPrice, setListPrice] = useState(toDollars(product?.list_price_cents));
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map((v) => ({ kind: v.kind, label: v.label, delta: toDollars(v.price_delta_cents), stock: String(v.stock) })) ?? [],
  );
  const [badges, setBadges] = useState<string[]>(product?.badges ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "published" | "save" | null>(null);

  function validate(): { errors: Errors; body?: Record<string, unknown> } {
    const e: Errors = {};
    const t = title.trim().replace(/\s+/g, " ");
    if (t.length < 3 || t.length > 200) e.title = "Title must be 3 to 200 characters.";
    if (brand.trim().length < 2 || brand.trim().length > 80) e.brand = "Enter a brand (2 to 80 characters).";
    if (!categoryId) e.category = "Choose a category.";
    const priceC = toCents(price);
    if (priceC === null || priceC < 1) e.price = "Enter a price, e.g. 49.99.";
    else if (priceC > 10_000_000) e.price = "Price can't be more than $100,000.";
    const listC = listPrice.trim() ? toCents(listPrice) : null;
    if (listPrice.trim() && listC === null) e.list = "Enter a valid list price, or leave it empty.";
    else if (listC !== null && priceC !== null && listC < priceC) e.list = "List price must be the same as or higher than the price.";
    const stockN = Number(stock);
    if (!/^\d+$/.test(stock.trim()) || stockN > 100_000) e.stock = "Enter a whole number from 0 to 100,000.";
    if (!images.length) e.images = "Add at least one image.";
    else if (images.some((u) => !isImageUrl(u))) e.images = "Every image needs an https:// URL.";
    const vs = variants.map((v) => ({ kind: v.kind, label: v.label.trim(), price_delta_cents: toCents(v.delta || "0"), stock: Number(v.stock || "0") }));
    if (vs.some((v) => !v.label)) e.variants = "Every variant needs a label.";
    else if (vs.some((v) => v.price_delta_cents === null || !Number.isInteger(v.stock) || v.stock < 0)) e.variants = "Check each variant's price change and stock.";
    else if (priceC !== null && vs.some((v) => priceC + (v.price_delta_cents ?? 0) < 1)) e.variants = "A variant can't make the price zero or negative.";
    if (Object.keys(e).length) return { errors: e };
    return {
      errors: e,
      body: {
        title: t,
        description: description.trim(),
        brand: brand.trim(),
        category_id: Number(categoryId),
        price_cents: priceC,
        list_price_cents: listC,
        stock: stockN,
        images,
        variants: vs,
        badges,
      },
    };
  }

  async function submit(mode: "draft" | "published" | "save", e?: FormEvent) {
    e?.preventDefault();
    const { errors: found, body } = validate();
    setErrors(found);
    setFormError(null);
    if (!body) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setBusy(mode);
    try {
      const payload = mode === "save" ? body : { ...body, status: mode };
      if (product) await api(`/seller/products/${product.id}`, { method: "PUT", body: payload });
      else await api("/seller/products", { method: "POST", body: payload });
      notify({
        kind: "success",
        message: mode === "published" ? "Published. It's live in the store." : mode === "draft" ? "Saved as a draft." : "Changes saved.",
      });
      router.push("/seller/products");
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(null);
    }
  }

  const parents = categories.filter((c) => !c.parent_slug);
  return (
    <form onSubmit={(e) => submit(product ? "save" : "published", e)} noValidate className="space-y-6">
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-control bg-deal-soft p-3 text-sm font-semibold text-deal">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> {formError}
        </p>
      )}

      <section className="space-y-5 rounded-card bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-extrabold">Basics</h2>
        <Field id="title" label="Title" error={errors.title}>
          {/* A textarea that grows with the text, so a long title is never hidden. Enter still
              submits, like the one-line input it replaces; whitespace is normalised on save. */}
          <textarea
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            maxLength={210}
            aria-invalid={!!errors.title}
            className={`${sellerInput(!!errors.title)} field-sizing-content min-h-12 resize-none py-3 break-words`}
          />
        </Field>
        <Field id="description" label="Description" hint="What it is, who it's for, what's in the box.">
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={5000} className={`${sellerInput(false)} py-3`} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="brand" label="Brand" hint="Pick an existing brand or type a new one." error={errors.brand}>
            <input id="brand" list="brand-options" value={brand} onChange={(e) => setBrand(e.target.value)} aria-invalid={!!errors.brand} className={`${sellerInput(!!errors.brand)} h-12`} />
            <datalist id="brand-options">
              {brands.map((b) => (
                <option key={b.slug} value={b.name} />
              ))}
            </datalist>
          </Field>
          <Field id="category" label="Category" error={errors.category}>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={!!errors.category} className={`${sellerInput(!!errors.category)} h-12`}>
              <option value="">Choose a category</option>
              {parents.map((p) => {
                const children = categories.filter((c) => c.parent_slug === p.slug);
                return children.length ? (
                  <optgroup key={p.slug} label={p.name}>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                );
              })}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-5 rounded-card bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-extrabold">Price and stock</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="price" label="Price ($)" error={errors.price}>
            <input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.99" aria-invalid={!!errors.price} className={`${sellerInput(!!errors.price)} h-12`} />
          </Field>
          <Field id="list" label="List price ($, optional)" hint="Shown struck through when higher." error={errors.list}>
            <input id="list" inputMode="decimal" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="59.99" aria-invalid={!!errors.list} className={`${sellerInput(!!errors.list)} h-12`} />
          </Field>
          <Field id="stock" label="Stock" error={errors.stock}>
            <input id="stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="25" aria-invalid={!!errors.stock} className={`${sellerInput(!!errors.stock)} h-12`} />
          </Field>
        </div>
      </section>

      <section className="space-y-6 rounded-card bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-extrabold">Images, options and badges</h2>
        <ImagesField images={images} onChange={setImages} error={errors.images} />
        <VariantsField variants={variants} onChange={setVariants} error={errors.variants} />
        <BadgesField value={badges} onChange={setBadges} />
      </section>

      <div className="sticky bottom-16 z-20 flex flex-wrap items-center justify-end gap-2 rounded-card bg-surface/95 p-3 shadow-pop backdrop-blur lg:bottom-4">
        <Link href="/seller/products" className="mr-auto inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ink-muted hover:underline">
          Cancel
        </Link>
        {product ? (
          <>
            <span className="text-sm text-ink-muted">
              Status: <span className="font-bold text-ink">{product.status === "published" ? "Published" : "Draft"}</span>
            </span>
            <Button type="submit" variant="primary" loading={busy === "save"} disabled={busy !== null}>
              Save changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" loading={busy === "draft"} disabled={busy !== null} onClick={() => submit("draft")}>
              Save as draft
            </Button>
            <Button type="submit" variant="primary" loading={busy === "published"} disabled={busy !== null}>
              Publish
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
