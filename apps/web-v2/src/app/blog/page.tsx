import ArticleCard from '@/components/ArticleCard';
import { ITarget } from '@/components/icons';
import { DEMO_ARTICLES } from '@/lib/demo';

// /blog — pixel-clone Findit "Insights & real estate tips" · header + grid การ์ดบทความ
export default function BlogPage() {
  return (
    <section className="wrap py-16 md:py-20">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Blog
          </p>
          <h1 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Insights &amp; real estate tips</h1>
        </div>
        <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
          Expert tips, market trends, and property advice to help you make confident decisions on your real estate journey.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_ARTICLES.map((a) => <ArticleCard key={a.slug} a={a} />)}
      </div>
    </section>
  );
}
