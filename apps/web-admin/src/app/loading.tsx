/** Route loading boundary (#11) — Minimal Luxury spinner */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="กำลังโหลด">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
    </div>
  );
}
