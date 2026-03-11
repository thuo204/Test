import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CourseCard } from './CourseCard';

async function getFeaturedCourses() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/courses/featured`, {
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function FeaturedCourses() {
  const courses = await getFeaturedCourses();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-primary-600 font-medium text-sm uppercase tracking-wide mb-2">Top Picks</p>
            <h2 className="text-3xl font-bold text-gray-900">Featured Courses</h2>
            <p className="text-gray-500 mt-2">Hand-picked courses by our expert team</p>
          </div>
          <Link href="/courses" className="hidden md:flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            View all courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.slice(0, 8).map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-video skeleton" />
                <div className="p-5 space-y-3">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-full" />
                  <div className="h-3 skeleton rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link href="/courses" className="btn-secondary inline-flex items-center gap-2">
            View all courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
