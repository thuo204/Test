import Link from 'next/link';
import { BookOpen, Twitter, Linkedin, Github, Youtube, Mail, MapPin, Phone } from 'lucide-react';

const footerLinks = {
  platform: [
    { href: '/courses', label: 'Browse Courses' },
    { href: '/blog', label: 'Blog' },
    { href: '/auth/register', label: 'Become an Instructor' },
  ],
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
  categories: [
    { href: '/courses?category=web-development', label: 'Web Development' },
    { href: '/courses?category=data-science', label: 'Data Science' },
    { href: '/courses?category=mobile-development', label: 'Mobile Dev' },
    { href: '/courses?category=devops', label: 'DevOps' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Edu<span className="text-primary-400">Stream</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">
              Empowering learners worldwide with expert-led courses, insightful articles, and a vibrant community. Start your learning journey today.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Twitter, href: '#', label: 'Twitter' },
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
                { icon: Github, href: '#', label: 'GitHub' },
                { icon: Youtube, href: '#', label: 'YouTube' },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-9 h-9 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Platform', links: footerLinks.platform },
            { title: 'Company', links: footerLinks.company },
            { title: 'Categories', links: footerLinks.categories },
          ].map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-white font-semibold mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> support@edustream.com</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} EduStream. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
