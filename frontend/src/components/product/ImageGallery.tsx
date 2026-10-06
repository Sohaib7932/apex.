"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useState, type MouseEvent } from "react";

import { ProductBadge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/ui/ProductImage";

/**
 * Thumbnails + large image. On devices with a mouse, hovering the large image
 * zooms in where the pointer is (PRD 4.4, P1).
 */
export function ImageGallery({ images, title, badge }: { images: string[]; title: string; badge?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const src = images[index] ?? null;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                onMouseEnter={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index ? "true" : undefined}
                className={`block size-16 overflow-hidden rounded-control border-2 bg-surface sm:size-18 ${
                  i === index ? "border-primary" : "border-line hover:border-ink-subtle"
                }`}
              >
                <ProductImage src={img} alt="" sizes="72px" className="size-full" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-card bg-surface-tint md:cursor-zoom-in"
          onMouseMove={onMove}
          onMouseLeave={() => setZoom(null)}
        >
          {src ? (
            <Image
              src={src}
              alt={title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover transition-transform duration-150"
              style={
                zoom
                  ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : { transform: "scale(1)" }
              }
            />
          ) : (
            <div className="grid size-full place-items-center text-sm text-ink-muted">No image</div>
          )}
        </div>
        {badge && (
          <span className="absolute top-3 left-3">
            <ProductBadge label={badge} />
          </span>
        )}
        <span className="pointer-events-none absolute top-3 right-3 hidden items-center gap-1 rounded-pill bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-muted md:flex">
          <Search aria-hidden="true" className="size-3.5" /> Hover to zoom
        </span>
      </div>
    </div>
  );
}
