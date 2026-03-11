'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Play, Star, Users, BookOpen, Award } from 'lucide-react';

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/90 mb-6">
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            Join 50,000+ learners worldwide
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Learn skills that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-primary-300">
              matter today
            </span>
          </h1>

          <p className="text-xl text-white/70 mb-10 leading-relaxed">
            Access 500+ expert-led courses in web development, data science, design, and more. 
            Start learning at your own pace.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative max-w-xl mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you want to learn?"
              className="w-full pl-12 pr-36 py-4 bg-white rounded-xl text-gray-900 placeholder-gray-400 text-base shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Search
            </button>
          </form>

          {/* Popular searches */}
          <div className="flex flex-wrap gap-2 mb-12">
            <span className="text-white/50 text-sm">Popular:</span>
            {['React', 'Python', 'Machine Learning', 'Node.js', 'Docker'].map((term) => (
              <button
                key={term}
                onClick={() => router.push(`/courses?search=${term}`)}
                className="text-sm text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors border border-white/10"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, value: '500+', label: 'Courses' },
              { icon: Users, value: '50K+', label: 'Students' },
              { icon: Star, value: '4.8', label: 'Avg Rating' },
              { icon: Award, value: '98%', label: 'Satisfaction' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-xs text-white/50">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
