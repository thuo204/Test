'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { courseApi, categoryApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const DIFFICULTY_OPTIONS = ['all', 'beginner', 'intermediate', 'advanced'];
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

interface CourseListingsProps {
  searchParams: Record<string, string>;
}

export function CourseListings({ searchParams: initialParams }: CourseListingsProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  
  const [filters, setFilters] = useState({
    search: searchParamsHook.get('search') || '',
    category: searchParamsHook.get('category') || '',
    difficulty: searchParamsHook.get('difficulty') || 'all',
    sort: searchParamsHook.get('sort') || 'popular',
    free: searchParamsHook.get('free') || '',
    page: parseInt(searchParamsHook.get('page') || '1'),
  });
  
  const [showFilters, setShowFilters] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['courses', filters],
    queryFn: () => courseApi.getAll({
      ...filters,
      difficulty: filters.difficulty === 'all' ? undefined : filters.difficulty,
    }).then(r => r.data.data),
  });

  const updateFilter = useCallback((key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : prev.page }));
  }, []);

  const clearFilters = () => {
    setFilters({ search: '', category: '', difficulty: 'all', sort: 'popular', free: '', page: 1 });
  };

  const hasActiveFilters = filters.search || filters.category || filters.difficulty !== 'all' || filters.free;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="input pl-11"
          />
        </div>
        
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="input w-full sm:w-48"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 btn-secondary ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {categoriesData?.map((cat: any) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="label">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => updateFilter('difficulty', e.target.value)}
              className="input"
            >
              {DIFFICULTY_OPTIONS.map(d => (
                <option key={d} value={d}>{d === 'all' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="label">Price</label>
            <select
              value={filters.free}
              onChange={(e) => updateFilter('free', e.target.value)}
              className="input"
            >
              <option value="">Any Price</option>
              <option value="true">Free Only</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <button onClick={clearFilters} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                <X className="w-4 h-4" /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-video skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded" />
                <div className="h-3 skeleton rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.courses?.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {data.pagination.total} course{data.pagination.total !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          
          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - filters.page) <= 2)
                .map(page => (
                  <button
                    key={page}
                    onClick={() => updateFilter('page', page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === filters.page
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <button onClick={clearFilters} className="btn-primary">Clear all filters</button>
        </div>
      )}
    </div>
  );
}
