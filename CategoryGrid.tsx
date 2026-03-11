import Link from 'next/link';
import { Code, BarChart2, Smartphone, Server, Pencil, Briefcase, Shield, Cpu } from 'lucide-react';

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()).data || [];
  } catch { return []; }
}

const iconMap: Record<string, any> = {
  'web-development': Code,
  'data-science': BarChart2,
  'mobile-development': Smartphone,
  'devops': Server,
  'design': Pencil,
  'business': Briefcase,
  'cybersecurity': Shield,
  'ai-machine-learning': Cpu,
};

const colorMap = [
  'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
  'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100',
  'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
  'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
  'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100',
  'bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-100',
  'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100',
];

export async function CategoryGrid() {
  const categories = await getCategories();

  return (
    <section className="py-16 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-primary-600 font-medium text-sm uppercase tracking-wide mb-2">Explore</p>
          <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
          <p className="text-gray-500 mt-2">Find courses in your area of interest</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {categories.map((cat: any, i: number) => {
            const Icon = iconMap[cat.slug] || Code;
            const colorClass = colorMap[i % colorMap.length];
            return (
              <Link
                key={cat.slug}
                href={`/courses?category=${cat.slug}`}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-200 text-center group ${colorClass}`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold leading-tight">{cat.name}</span>
                <span className="text-xs opacity-70">{cat.course_count} courses</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
