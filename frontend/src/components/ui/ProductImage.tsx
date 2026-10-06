import Image from "next/image";

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

/**
 * Product photo in a fixed-ratio well. Local and allow-listed images are optimized;
 * seller-supplied URLs on other hosts are shown as-is.
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
  if (!src) {
    return (
      <div className={`grid place-items-center bg-surface-tint text-xs text-ink-muted ${className}`}>No image</div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-surface-tint ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!canOptimize(src)}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
