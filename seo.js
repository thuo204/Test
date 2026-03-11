const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// Sitemap XML
router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const [articles, courses, categories] = await Promise.all([
    query("SELECT slug, updated_at FROM articles WHERE status = 'published'"),
    query("SELECT slug, updated_at FROM courses WHERE status = 'published'"),
    query("SELECT slug FROM categories WHERE is_active = true"),
  ]);
  
  const baseUrl = process.env.APP_URL || 'https://yourdomain.com';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/courses</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
`;
  
  articles.rows.forEach(a => {
    xml += `  <url><loc>${baseUrl}/blog/${a.slug}</loc><lastmod>${a.updated_at?.toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  });
  
  courses.rows.forEach(c => {
    xml += `  <url><loc>${baseUrl}/courses/${c.slug}</loc><lastmod>${c.updated_at?.toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  });
  
  categories.rows.forEach(c => {
    xml += `  <url><loc>${baseUrl}/blog/category/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
  });
  
  xml += '</urlset>';
  
  res.set('Content-Type', 'application/xml');
  res.send(xml);
}));

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || 'https://yourdomain.com';
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api/
Disallow: /checkout

Sitemap: ${baseUrl}/api/v1/seo/sitemap.xml`);
});

module.exports = router;
