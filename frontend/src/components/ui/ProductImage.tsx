"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/** Hosts that next/image may optimize (keep in sync with images.remotePatterns in next.config.ts). */
const OPTIMIZED_HOSTS = ["images.unsplash.com"];

function canOptimize(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

function Placeholder({ className }: { className: string }) {
  return (
    <div
      role="img"
      aria-label="Image not available"
      className={`grid place-items-center bg-surface-tint text-ink-subtle ${className}`}
    >
      <ImageOff aria-hidden="true" className="size-1/4 max-h-10 min-h-4 max-w-10 min-w-4" />
    </div>
  );
}

/**
 * Product photo in a fixed-ratio well (the parent sets the ratio, the photo is cropped
 * to fill it, never stretched). Missing or broken images show a neutral placeholder.
 * Local and allow-listed images are optimized; other seller-supplied URLs are shown as-is.
 */
export function ProductImage({
  src,
  alt,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  className = "",
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <Placeholder className={className} />;
  return (
    <div className={`relative overflow-hidden bg-surface-tint ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        unoptimized={!canOptimize(src)}
        onError={() => setFailed(src)}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
