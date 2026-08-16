import Link from 'next/link';
import type { DemoArticle } from '@/lib/demo';

// ArticleCard — รูปมุมโค้งบนพื้น soft + title + excerpt · reuse Home Insights + Blog list
export default function ArticleCard({ a }: { a: DemoArticle }) {
  return (
    <Link href={`/blog/${a.slug}`} className="group flex flex-col overflow-hidden rounded-card bg-soft transition hover:shadow-[0_14px_44px_rgba(0,0,0,0.10)]">
      <div className="aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-medium leading-snug text-ink">{a.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-body">{a.excerpt}</p>
      </div>
    </Link>
  );
}
