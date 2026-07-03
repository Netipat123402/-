/**
 * ชุด loading 3 แบบ (แต่ละแบบมีหน้าที่ต่างกัน)
 *  - Spinner    = "กำลังทำงานอยู่" (รอสั้น ๆ เช่น กดส่ง/รีเฟรช)
 *  - ProgressBar = "เหลืออีกเท่าไหร่" (งานยาว เช่น อัปโหลดไฟล์)
 *  - Skeleton   = "content กำลังมา" (โหลดหน้า/เนื้อหา — รู้สึกเร็วสุด)
 */

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span role="status" aria-label="กำลังทำงาน"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
  );
}

export function ProgressBar({ value }: { value: number }) {
  const w = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60" role="progressbar" aria-valuenow={w}>
      <div className="h-full rounded-full bg-gold transition-[width] duration-200" style={{ width: `${w}%` }} />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

export function PropertyCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-border/60" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => <PropertyCardSkeleton key={i} />)}
    </div>
  );
}
