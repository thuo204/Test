-- ================================================
-- EduStream Platform - Seed Data
-- ================================================

-- Categories
INSERT INTO categories (id, name, slug, description, icon, color, sort_order) VALUES
    (uuid_generate_v4(), 'Web Development', 'web-development', 'Learn modern web technologies', 'code', '#2563EB', 1),
    (uuid_generate_v4(), 'Data Science', 'data-science', 'Python, ML, and Data Analysis', 'chart-bar', '#14B8A6', 2),
    (uuid_generate_v4(), 'Mobile Development', 'mobile-development', 'iOS and Android development', 'device-mobile', '#F59E0B', 3),
    (uuid_generate_v4(), 'DevOps', 'devops', 'Cloud, Docker, Kubernetes', 'server', '#EF4444', 4),
    (uuid_generate_v4(), 'Design', 'design', 'UI/UX and Graphic Design', 'pencil', '#8B5CF6', 5),
    (uuid_generate_v4(), 'Business', 'business', 'Entrepreneurship and Marketing', 'briefcase', '#EC4899', 6),
    (uuid_generate_v4(), 'Cybersecurity', 'cybersecurity', 'Ethical hacking and security', 'shield-check', '#06B6D4', 7),
    (uuid_generate_v4(), 'AI & Machine Learning', 'ai-machine-learning', 'Artificial Intelligence courses', 'chip', '#10B981', 8);

-- Tags
INSERT INTO tags (name, slug) VALUES
    ('JavaScript', 'javascript'),
    ('Python', 'python'),
    ('React', 'react'),
    ('Node.js', 'nodejs'),
    ('TypeScript', 'typescript'),
    ('Docker', 'docker'),
    ('AWS', 'aws'),
    ('Machine Learning', 'machine-learning'),
    ('CSS', 'css'),
    ('PostgreSQL', 'postgresql'),
    ('Next.js', 'nextjs'),
    ('GraphQL', 'graphql'),
    ('REST API', 'rest-api'),
    ('Git', 'git'),
    ('Linux', 'linux');

-- Admin user (password: Admin@123456)
INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, is_verified, email_verified_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@edustream.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpuWDBkOl0DJWi', 'Admin User', 'admin', true, true, NOW()),
    ('00000000-0000-0000-0000-000000000002', 'instructor@edustream.com', 'johndoe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpuWDBkOl0DJWi', 'John Doe', 'instructor', true, true, NOW()),
    ('00000000-0000-0000-0000-000000000003', 'student@edustream.com', 'janedoe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpuWDBkOl0DJWi', 'Jane Doe', 'student', true, true, NOW());

UPDATE users SET bio = 'Full-stack developer and passionate educator with 10+ years of experience.' WHERE id = '00000000-0000-0000-0000-000000000002';

-- Sample courses
INSERT INTO courses (id, title, slug, short_description, description, instructor_id, category_id, price, status, difficulty, is_featured, is_free, enrollment_count, rating_average, rating_count, total_duration, total_lessons, requirements, what_you_learn, target_audience, published_at)
SELECT 
    uuid_generate_v4(),
    'Complete React & Next.js Developer Course',
    'complete-react-nextjs-developer-course',
    'Master React 18, Next.js 14, and build production-ready full-stack applications.',
    'This comprehensive course takes you from React beginner to expert developer. You will learn React fundamentals, hooks, context API, Next.js App Router, server components, and much more. Build 5 real-world projects throughout the course.',
    '00000000-0000-0000-0000-000000000002',
    c.id,
    49.99,
    'published',
    'intermediate',
    true,
    false,
    1247,
    4.8,
    342,
    3600,
    45,
    ARRAY['Basic HTML and CSS knowledge', 'JavaScript fundamentals', 'A computer with internet access'],
    ARRAY['Build complete React applications', 'Master Next.js App Router', 'Server-side rendering', 'API Routes and full-stack development', 'State management with Redux/Zustand', 'Deploy to Vercel and AWS'],
    ARRAY['Junior developers', 'Frontend developers wanting to upgrade', 'Anyone wanting to learn React'],
    NOW()
FROM categories c WHERE c.slug = 'web-development' LIMIT 1;

INSERT INTO courses (id, title, slug, short_description, description, instructor_id, category_id, price, status, difficulty, is_featured, is_free, enrollment_count, rating_average, rating_count, total_duration, total_lessons, requirements, what_you_learn, target_audience, published_at)
SELECT 
    uuid_generate_v4(),
    'Python for Data Science & Machine Learning',
    'python-data-science-machine-learning',
    'Learn Python, NumPy, Pandas, Matplotlib, Scikit-Learn and build ML models from scratch.',
    'Comprehensive data science course covering Python programming, statistical analysis, data visualization, and machine learning algorithms. Build real-world data science projects and learn to deploy ML models.',
    '00000000-0000-0000-0000-000000000002',
    c.id,
    59.99,
    'published',
    'beginner',
    true,
    false,
    892,
    4.7,
    215,
    4200,
    52,
    ARRAY['Basic math knowledge', 'No programming experience needed'],
    ARRAY['Python fundamentals', 'Data manipulation with Pandas', 'Machine learning algorithms', 'Neural networks basics', 'Data visualization', 'Deploy ML models'],
    ARRAY['Aspiring data scientists', 'Python beginners', 'Business analysts'],
    NOW()
FROM categories c WHERE c.slug = 'data-science' LIMIT 1;

-- Sample modules for first course
DO $$
DECLARE
    course_id UUID;
    module1_id UUID;
    module2_id UUID;
    module3_id UUID;
BEGIN
    SELECT id INTO course_id FROM courses WHERE slug = 'complete-react-nextjs-developer-course';
    module1_id := uuid_generate_v4();
    module2_id := uuid_generate_v4();
    module3_id := uuid_generate_v4();
    
    INSERT INTO modules (id, course_id, title, description, sort_order, is_free_preview) VALUES
        (module1_id, course_id, 'Getting Started with React', 'Introduction to React fundamentals', 1, true),
        (module2_id, course_id, 'React Hooks Deep Dive', 'Master useState, useEffect, and custom hooks', 2, false),
        (module3_id, course_id, 'Next.js App Router', 'Build full-stack apps with Next.js 14', 3, false);
    
    INSERT INTO lessons (module_id, course_id, title, description, content_type, video_duration, sort_order, is_free_preview) VALUES
        (module1_id, course_id, 'What is React and Why Use It?', 'Overview of React and its ecosystem', 'video', 480, 1, true),
        (module1_id, course_id, 'Setting Up Your Development Environment', 'Install Node.js, VS Code, and create-react-app', 'video', 720, 2, true),
        (module1_id, course_id, 'Your First React Component', 'Build and render your first component', 'video', 900, 3, false),
        (module2_id, course_id, 'useState Hook Explained', 'Managing state in functional components', 'video', 1200, 1, false),
        (module2_id, course_id, 'useEffect and Side Effects', 'Handle side effects and lifecycle', 'video', 1500, 2, false),
        (module3_id, course_id, 'Next.js App Router Overview', 'Understanding the new App Router paradigm', 'video', 1200, 1, false),
        (module3_id, course_id, 'Server vs Client Components', 'When to use each type', 'video', 1800, 2, false);
END $$;

-- Sample articles
DO $$
DECLARE
    author_id UUID;
    cat_id UUID;
BEGIN
    SELECT id INTO author_id FROM users WHERE username = 'admin';
    SELECT id INTO cat_id FROM categories WHERE slug = 'web-development';
    
    INSERT INTO articles (title, slug, excerpt, content, author_id, category_id, status, is_featured, view_count, read_time, seo_title, seo_description, published_at) VALUES
    (
        '10 Best Practices for React Performance Optimization in 2024',
        '10-best-practices-react-performance-optimization-2024',
        'Discover the top React performance optimization techniques that will make your applications blazing fast.',
        '<h2>Introduction</h2><p>React applications can become slow as they grow. Here are 10 proven techniques to keep your app fast.</p><h2>1. Use React.memo for Component Memoization</h2><p>React.memo prevents unnecessary re-renders by memoizing the output of a component...</p><h2>2. Implement Code Splitting</h2><p>Use dynamic imports and React.lazy to split your bundle...</p>',
        author_id,
        cat_id,
        'published',
        true,
        3421,
        8,
        '10 React Performance Optimization Tips | EduStream',
        'Learn the top 10 React performance optimization techniques to build faster applications in 2024.',
        NOW() - INTERVAL '5 days'
    ),
    (
        'Understanding Next.js Server Components: A Complete Guide',
        'understanding-nextjs-server-components-complete-guide',
        'Server Components are the future of React. Learn how they work and when to use them.',
        '<h2>What Are Server Components?</h2><p>React Server Components allow rendering components on the server without sending JavaScript to the client...</p>',
        author_id,
        cat_id,
        'published',
        false,
        1892,
        12,
        'Next.js Server Components Guide | EduStream',
        'Complete guide to understanding and using Next.js Server Components effectively.',
        NOW() - INTERVAL '10 days'
    );
END $$;

-- Sample ads
INSERT INTO ads (name, placement, ad_type, adsense_slot, is_active) VALUES
    ('Homepage Banner', 'homepage_banner', 'adsense', '1234567890', true),
    ('Blog Sidebar', 'blog_sidebar', 'adsense', '0987654321', true),
    ('Article Inline', 'article_inline', 'adsense', '1122334455', true);
