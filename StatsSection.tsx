// StatsSection.tsx
export function StatsSection() {
  const stats = [
    { value: '500+', label: 'Expert Courses' },
    { value: '50K+', label: 'Active Learners' },
    { value: '200+', label: 'Expert Instructors' },
    { value: '4.8/5', label: 'Average Rating' },
  ];
  return (
    <section className="bg-white border-b border-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-bold text-primary-600 mb-1">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
