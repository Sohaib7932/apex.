import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading product" className="mx-auto max-w-375 space-y-6 px-4 py-5 md:px-6">
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_20rem]">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-12 w-2/3" />
        </div>
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    </div>
  );
}
