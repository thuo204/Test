import Link from 'next/link';
import Image from 'next/image';
import { Star, Users, Clock, BookOpen, BadgeCheck } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    short_description?: string;
    cover_image_url?: string;
    price: number;
    original_price?: number;
    is_free: boolean;
    difficulty: string;
    enrollment_count: number;
    rating_average: number;
    rating_count: number;
    total_duration: number;
    total_lessons: number;
    instructor_name: string;
    instructor_avatar?: string;
    category_name?: string;
  };
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
  'all-levels': 'bg-blue-100 text-blue-700',
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.slug}`} className="card group block overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary-400" />
          </div>
        )}
        {course.is_free && (
          <span className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
            FREE
          </span>
        )}
        <span className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-md ${difficultyColors[course.difficulty] || difficultyColors['all-levels']}`}>
          {course.difficulty}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        {course.category_name && (
          <p className="text-xs font-medium text-primary-600 mb-2 uppercase tracking-wide">
            {course.category_name}
          </p>
        )}
        
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>
        
        {course.short_description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.short_description}</p>
        )}

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-4">
          {course.instructor_avatar ? (
            <img src={course.instructor_avatar} alt={course.instructor_name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 text-xs font-semibold">{course.instructor_name?.charAt(0)}</span>
            </div>
          )}
          <span className="text-xs text-gray-600">{course.instructor_name}</span>
          <BadgeCheck className="w-3.5 h-3.5 text-primary-500" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-gray-700">{course.rating_average.toFixed(1)}</span>
            ({course.rating_count.toLocaleString()})
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.enrollment_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(course.total_duration)}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-baseline gap-2">
            {course.is_free ? (
              <span className="text-lg font-bold text-accent-600">Free</span>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-900">${course.price}</span>
                {course.original_price && course.original_price > course.price && (
                  <span className="text-sm text-gray-400 line-through">${course.original_price}</span>
                )}
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">{course.total_lessons} lessons</span>
        </div>
      </div>
    </Link>
  );
}
