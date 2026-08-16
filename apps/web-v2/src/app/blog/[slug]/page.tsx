import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { DEMO_ARTICLES } from '@/lib/demo';

// /blog/[slug] — pixel-clone Findit · breadcrumb + title + hero + 2-col (meta ซ้าย · body ขวา) + related
export function generateStaticParams() {
  return DEMO_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = DEMO_ARTICLES.find((x) => x.slug === params.slug);
  if (!a) notFound();
  const related = DEMO_ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);

  return (
    <div className="wrap py-12 md:py-16">
      {/* breadcrumb + title */}
      <p className="text-sm text-muted"><Link href="/blog" className="transition hover:text-ink">Blog</Link> / {a.category}</p>
      <h1 className="mt-4 max-w-4xl text-[32px] font-medium leading-tight sm:text-[48px]">{a.title}</h1>

      {/* hero */}
      <div className="mt-8 overflow-hidden rounded-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.img} alt={a.title} className="aspect-[16/8] w-full object-cover" />
      </div>

      {/* body 2-col */}
      <div className="mt-12 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="mb-8 space-y-6 lg:mb-0">
          <div>
            <p className="text-xs text-muted">Posted at</p>
            <p className="mt-1 text-sm text-ink">{a.date}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Posted on</p>
            <p className="mt-1 text-sm text-ink">{a.category}</p>
          </div>
        </aside>
        <article className="max-w-[760px] space-y-5">
          {a.body.map((p, i) => <p key={i} className="leading-relaxed text-body">{p}</p>)}
        </article>
      </div>

      {/* related */}
      <div className="mt-16 border-t border-line pt-16">
        <h2 className="text-[30px] font-medium leading-tight sm:text-[42px]">Related articles</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((r) => <ArticleCard key={r.slug} a={r} />)}
        </div>
      </div>
    </div>
  );
}
