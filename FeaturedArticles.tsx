import Link from 'next/link';
import { ArrowRight, Clock, Eye } from 'lucide-react';

async function getFeaturedArticles() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/articles?featured=true&limit=4`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.articles || [];
  } catch { return []; }
}

export async function FeaturedArticles() {
  const articles = await getFeaturedArticles();
  if (articles.length === 0) return null;

  return (
    <section className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-accent-600 font-medium text-sm uppercase tracking-wide mb-2">From the Blog</p>
            <h2 className="text-3xl font-bold text-gray-900">Latest Articles</h2>
            <p className="text-gray-500 mt-2">Insights and tutorials from our expert instructors</p>
          </div>
          <Link href="/blog" className="hidden md:flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((article: any) => (
            <Link key={article.id} href={`/blog/${article.slug}`} className="card group overflow-hidden block">
              <div className="aspect-video overflow-hidden bg-gray-100">
                {article.cover_image_url ? (
                  <img
                    src={article.cover_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-50 to-accent-50" />
                )}
              </div>
              <div className="p-5">
                {article.category_name && (
                  <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">{article.category_name}</span>
                )}
                <h3 className="font-semibold text-gray-900 mt-2 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors text-sm leading-snug">
                  {article.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.read_time} min</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {article.view_count?.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/blog" className="btn-secondary inline-flex items-center gap-2">
            View all articles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
