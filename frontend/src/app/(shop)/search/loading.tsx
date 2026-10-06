import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading results">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-375 items-center justify-between px-4 py-3 md:px-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="mx-auto grid max-w-375 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden h-[36rem] rounded-card lg:block" />
        <GridSkeleton count={6} className="md:grid-cols-3 lg:grid-cols-3" />
      </div>
    </div>
  );
}
