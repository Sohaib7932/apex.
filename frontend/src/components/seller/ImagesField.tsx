"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";

import { FieldError, sellerInput } from "./StartSellingForm";

export function isImageUrl(url: string): boolean {
  if (url.startsWith("/")) return !url.startsWith("//") && !/\s/.test(url);
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Image URLs with live preview; reorder with the arrows; the first image is the main one. */
export function ImagesField({ images, onChange, error }: { images: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const valid = isImageUrl(draft.trim());

  const add = () => {
    const url = draft.trim();
    if (!isImageUrl(url)) return setDraftError("Use an image URL that starts with https://");
    if (images.includes(url)) return setDraftError("That image is already added.");
    if (images.length >= 8) return setDraftError("You can add up to 8 images.");
    onChange([...images, url]);
    setDraft("");
    setDraftError(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="text-sm font-bold">Images</legend>
      <p className="mt-0.5 text-sm text-ink-muted">Paste image URLs. The first image is the main one shown in search.</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="image-url" className="sr-only">
            Image URL
          </label>
          <input
            id="image-url"
            type="url"
            inputMode="url"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="https://images.unsplash.com/photo-..."
            aria-describedby="image-url-error"
            className={`${sellerInput(!!draftError)} h-11`}
          />
          <FieldError id="image-url-error" message={draftError ?? undefined} />
        </div>
        {valid && (
          <ProductImage src={draft.trim()} alt="Preview of the image URL" sizes="88px" className="size-22 shrink-0 rounded-control border border-line" />
        )}
        <Button variant="seller" onClick={add} className="shrink-0">
          <ImagePlus aria-hidden="true" className="size-4" /> Add image
        </Button>
      </div>

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, i) => (
            <li key={url} className="rounded-card border border-line bg-surface p-2">
              <div className="relative">
                <ProductImage src={url} alt={`Image ${i + 1}`} sizes="160px" className="aspect-square w-full rounded-control" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-control bg-seller px-2 py-0.5 text-2xs font-bold text-on-seller">
                    Main
                  </span>
                )}
              </div>
              <div className="mt-2 flex justify-between">
                <div className="flex">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} earlier`} className="grid size-10 place-items-center rounded-control hover:bg-surface-tint disabled:opacity-30">
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move image ${i + 1} later`} className="grid size-10 place-items-center rounded-control hover:bg-surface-tint disabled:opacity-30">
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`} className="grid size-10 place-items-center rounded-control text-danger hover:bg-deal-soft">
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FieldError id="images-error" message={error} />
    </fieldset>
  );
}
