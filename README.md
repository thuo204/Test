# EduStream Platform

A production-ready **Blog + Online Course Platform + Ads Monetization Ecosystem** built with Next.js, Express, PostgreSQL, and Redis.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        NGINX                             │
│              (Reverse Proxy + SSL Termination)           │
└─────────────┬────────────────────┬──────────────────────┘
              │                    │
    ┌─────────▼────────┐  ┌───────▼────────┐
    │   Next.js 14     │  │  Express API   │
    │   (Frontend)     │  │  (Backend)     │
    │   Port 3000      │  │  Port 4000     │
    └──────────────────┘  └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
           ┌────────▼──┐  ┌──────▼───┐  ┌─────▼──────┐
           │PostgreSQL │  │  Redis   │  │  FFmpeg    │
           │  DB       │  │  Cache   │  │  (Video)   │
           └───────────┘  └──────────┘  └────────────┘
```

## 📋 Features

### Blog System
- ✅ Categories, tags, SEO meta tags
- ✅ Comments with moderation
- ✅ Related articles engine
- ✅ Auto schema markup (JSON-LD)
- ✅ Sitemap.xml + robots.txt
- ✅ View count tracking

### Course Platform
- ✅ Course catalog with filters
- ✅ Course search
- ✅ Curriculum with modules/lessons
- ✅ Student reviews & ratings
- ✅ Enrollment system

### Video Protection
- ✅ HLS segmented streaming
- ✅ Signed token URLs (1hr expiry)
- ✅ Dynamic watermark (email + timestamp)
- ✅ Right-click disabled on player
- ✅ Anti-hotlinking protection

### User System
- ✅ JWT authentication (access + refresh tokens)
- ✅ Role-based access (student / instructor / admin)
- ✅ Password hashing (bcrypt)
- ✅ Progress tracking

### Admin Panel
- ✅ User management (roles, suspend)
- ✅ Course management
- ✅ Blog management
- ✅ Comment moderation
- ✅ Contact messages
- ✅ Analytics dashboard

### Ads Monetization
- ✅ Google AdSense integration
- ✅ Placements: homepage banner, blog sidebar, article inline, article sidebar
- ✅ Ad-free: course player, checkout, user dashboard

### Security
- ✅ Rate limiting (global + per-route)
- ✅ IP throttling
- ✅ Input sanitization (XSS protection)
- ✅ User-agent filtering (bot blocking)
- ✅ Request fingerprinting
- ✅ Helmet.js security headers
- ✅ CORS configuration

### Performance
- ✅ Redis caching (homepage, articles, courses)
- ✅ Next.js SSR + ISR
- ✅ Image optimization (WebP conversion)
- ✅ Lazy loading
- ✅ CDN-ready asset structure

---

## 🚀 Quick Start

### Prerequisites
- Docker 24+
- Docker Compose 2.20+
- 2GB+ RAM
- 20GB+ disk space

### 1. Clone and configure
```bash
git clone https://github.com/yourorg/edustream.git
cd edustream
cp .env.example .env
# Edit .env with your values
nano .env
```

### 2. Deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3. Access
- **Frontend**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Admin**: https://yourdomain.com/admin

**Default admin credentials:**
- Email: `admin@edustream.com`
- Password: `Admin@123456` ← Change immediately!

---

## 🔧 Manual Setup (Development)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Configure DB and Redis in .env

# Start PostgreSQL and Redis (via Docker)
docker run -d --name pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:15
docker run -d --name redis -p 6379:6379 redis:7

# Run migrations
node src/scripts/migrate.js

# Seed database
node src/scripts/seed.js

# Start dev server
npm run dev
```

### Frontend
```bash
cd frontend
npm install

# Copy .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EduStream
EOF

npm run dev
```

---

## 📁 Project Structure

```
project-root/
├── frontend/                  # Next.js 14 frontend
│   └── src/
│       ├── app/               # App Router pages
│       │   ├── page.tsx       # Homepage
│       │   ├── blog/          # Blog pages
│       │   ├── courses/       # Course pages + player
│       │   ├── dashboard/     # User dashboard
│       │   ├── admin/         # Admin panel
│       │   ├── auth/          # Login/Register
│       │   └── contact/       # Contact page
│       ├── components/        # React components
│       │   ├── layout/        # Navbar, Footer, Hero
│       │   ├── course/        # Course components
│       │   ├── blog/          # Blog components
│       │   └── ads/           # Ad components
│       ├── lib/               # API client
│       └── store/             # Zustand state
│
├── backend/                   # Express.js API
│   └── src/
│       ├── routes/            # All API routes
│       ├── controllers/       # Business logic
│       ├── middleware/        # Auth, rate limiting, security
│       ├── services/          # Video processing
│       ├── config/            # DB, Redis config
│       └── utils/             # Logger, helpers
│
├── database/
│   ├── migrations/            # SQL schema migrations
│   └── seeds/                 # Test data seeds
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
├── scripts/
│   └── deploy.sh
│
├── docker-compose.yml
└── .env.example
```

---

## 🛠️ Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | Min 64 chars, random string |
| `VIDEO_SECRET_KEY` | Video signing key |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense publisher ID |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 secret |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| POST | /api/v1/auth/refresh | Refresh token |
| GET | /api/v1/auth/me | Get current user |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/courses | List courses |
| GET | /api/v1/courses/featured | Featured courses |
| GET | /api/v1/courses/:slug | Course detail |
| POST | /api/v1/courses | Create course |

### Blog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/articles | List articles |
| GET | /api/v1/articles/:slug | Article detail |
| POST | /api/v1/articles | Create article |

### Video
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/video/access/:lessonId | Get signed URL |
| GET | /api/v1/video/stream/:lessonId/master.m3u8 | HLS stream |
| POST | /api/v1/video/upload/:lessonId | Upload video |

---

## 🔐 Security Notes

1. **Change default passwords** before production deployment
2. **Set strong JWT_SECRET** (64+ random characters)
3. **Configure CORS** with your actual domain
4. **Use real SSL certificates** (Let's Encrypt recommended)
5. **Enable firewall** - only expose ports 80 and 443

---

## 🌐 Production Deployment (VPS)

```bash
# 1. Get SSL from Let's Encrypt
apt install certbot
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# 2. Copy certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/

# 3. Update nginx.conf with your domain
sed -i 's/yourdomain.com/your-actual-domain.com/g' docker/nginx.conf

# 4. Deploy
./scripts/deploy.sh
```

---

## 📊 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh tokens) |
| Video | HLS.js, FFmpeg, Signed URLs |
| Proxy | Nginx |
| Container | Docker, Docker Compose |

---

## 📄 License

MIT © EduStream
