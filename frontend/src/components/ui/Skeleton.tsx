export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-surface-tint-2 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-card bg-surface p-3 shadow-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <Skeleton className="mt-3 h-6 w-1/2" />
      <Skeleton className="mt-3 h-11 w-full" />
    </div>
  );
}

export function GridSkeleton({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Generic page-level loading block used by loading.tsx files. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-375 space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-8 w-64" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-card" />
      ))}
    </div>
  );
}
