import { CardGridSkeleton, Skeleton } from '@/components/loaders';

/** Route loading boundary — skeleton "content กำลังมา" (รู้สึกเร็วกว่า spinner) */
export default function Loading() {
  return (
    <main className="mx-auto max-w-content px-4 py-8 lg:px-8">
      <Skeleton className="h-12 w-full max-w-xl rounded-xl2" />
      <Skeleton className="mt-6 h-5 w-28" />
      <div className="mt-4">
        <CardGridSkeleton count={6} />
      </div>
    </main>
  );
}
