'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Users, Clock, BookOpen, Play, Check, ChevronDown, ChevronUp,
  Globe, Award, Lock, Unlock, BadgeCheck, ShoppingCart
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { enrollmentApi } from '@/lib/api';
import toast from 'react-hot-toast';

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CourseDetailClient({ course }: { course: any }) {
  const [expandedModules, setExpandedModules] = useState<string[]>(
    course.curriculum?.[0]?.id ? [course.curriculum[0].id] : []
  );
  const [enrolling, setEnrolling] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/courses/${course.slug}`);
      return;
    }
    setEnrolling(true);
    try {
      await enrollmentApi.enroll(course.id);
      toast.success('Enrolled successfully!');
      router.push(`/courses/${course.slug}/learn`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        router.push(`/courses/${course.slug}/learn`);
      } else if (error.response?.status === 402) {
        toast.error('Payment required. Checkout coming soon!');
      } else {
        toast.error('Failed to enroll. Please try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Link href="/courses" className="text-gray-400 hover:text-white text-sm">Courses</Link>
                <span className="text-gray-600">/</span>
                {course.category_name && (
                  <>
                    <Link href={`/courses?category=${course.category_slug}`} className="text-gray-400 hover:text-white text-sm">
                      {course.category_name}
                    </Link>
                    <span className="text-gray-600">/</span>
                  </>
                )}
                <span className="text-gray-300 text-sm truncate max-w-xs">{course.title}</span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">{course.title}</h1>
              <p className="text-gray-300 text-lg mb-6">{course.short_description}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">{course.rating_average?.toFixed(1)}</span>
                  <span className="text-gray-400">({course.rating_count?.toLocaleString()} ratings)</span>
                </span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Users className="w-4 h-4" />
                  {course.enrollment_count?.toLocaleString()} students
                </span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Clock className="w-4 h-4" />
                  {formatDuration(course.total_duration)}
                </span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Globe className="w-4 h-4" />
                  {course.language}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {course.instructor_avatar ? (
                  <img src={course.instructor_avatar} alt={course.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{course.instructor_name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Instructor</p>
                  <p className="font-semibold">{course.instructor_name}</p>
                </div>
                <BadgeCheck className="w-5 h-5 text-primary-400" />
              </div>
            </div>

            {/* Enrollment Card desktop */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-24">
                {course.cover_image_url ? (
                  <div className="relative">
                    <img src={course.cover_image_url} alt={course.title} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary-600 fill-primary-600 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary-400" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-baseline gap-3 mb-5">
                    {course.is_free ? (
                      <span className="text-3xl font-bold text-accent-600">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">${course.price}</span>
                        {course.original_price > course.price && (
                          <span className="text-lg text-gray-400 line-through">${course.original_price}</span>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full btn-primary py-3.5 text-base font-semibold mb-3 flex items-center justify-center gap-2"
                  >
                    {enrolling ? 'Enrolling...' : course.is_free ? (
                      <><Unlock className="w-5 h-5" /> Enroll for Free</>
                    ) : (
                      <><ShoppingCart className="w-5 h-5" /> Enroll Now</>
                    )}
                  </button>
                  <p className="text-xs text-center text-gray-400 mb-5">30-day money-back guarantee</p>
                  <div className="space-y-2.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2.5"><BookOpen className="w-4 h-4 text-gray-400" /> {course.total_lessons} lessons</div>
                    <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-gray-400" /> {formatDuration(course.total_duration)} of content</div>
                    <div className="flex items-center gap-2.5"><Globe className="w-4 h-4 text-gray-400" /> {course.language}</div>
                    {course.certificate_enabled && <div className="flex items-center gap-2.5"><Award className="w-4 h-4 text-gray-400" /> Certificate of completion</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">

            {/* What you'll learn */}
            {course.what_you_learn?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What you'll learn</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-6 grid sm:grid-cols-2 gap-3">
                  {course.what_you_learn.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            {course.requirements?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {course.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Curriculum */}
            {course.curriculum?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Curriculum</h2>
                <div className="space-y-3">
                  {course.curriculum.map((module: any) => (
                    <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-primary-500" />
                          <span className="font-semibold text-gray-900">{module.title}</span>
                          {module.is_free_preview && (
                            <span className="badge bg-accent-100 text-accent-700">Free</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{module.lessons?.length || 0} lessons</span>
                          {expandedModules.includes(module.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {expandedModules.includes(module.id) && module.lessons?.length > 0 && (
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {module.lessons.map((lesson: any) => (
                            <div key={lesson.id} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-3">
                                {lesson.is_free_preview ? (
                                  <Play className="w-4 h-4 text-accent-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-300" />
                                )}
                                <span className="text-sm text-gray-700">{lesson.title}</span>
                                {lesson.is_free_preview && (
                                  <span className="text-xs text-accent-600 font-medium">Preview</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{formatDuration(lesson.video_duration || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Instructor */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About the Instructor</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
                {course.instructor_avatar ? (
                  <img src={course.instructor_avatar} alt={course.instructor_name} className="w-20 h-20 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-primary-600">{course.instructor_name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{course.instructor_name}</h3>
                  <p className="text-sm text-gray-500 mb-3">Expert Instructor</p>
                  {course.instructor_bio && <p className="text-sm text-gray-700 leading-relaxed">{course.instructor_bio}</p>}
                </div>
              </div>
            </section>

            {/* Reviews */}
            {course.reviews?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews</h2>
                <div className="flex items-center gap-6 mb-8 bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{course.rating_average?.toFixed(1)}</div>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-5 h-5 ${s <= Math.round(course.rating_average) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Course Rating</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map(star => {
                      const count = course.reviews.filter((r: any) => r.rating === star).length;
                      const pct = course.reviews.length ? Math.round((count / course.reviews.length) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-gray-500 w-6">{star}</span>
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-5">
                  {course.reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-primary-700 font-semibold text-sm">{review.full_name?.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{review.full_name}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          {review.title && <p className="font-medium text-sm text-gray-800 mb-1">{review.title}</p>}
                          {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar - mobile enrollment */}
          <div className="lg:hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-baseline gap-3 mb-4">
                {course.is_free ? (
                  <span className="text-2xl font-bold text-accent-600">Free</span>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">${course.price}</span>
                )}
              </div>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
