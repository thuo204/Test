#!/bin/bash
# =====================================================
# EduStream Platform - Full Deployment Script
# =====================================================

set -e

echo "🚀 EduStream Platform Deployment Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check dependencies
command -v docker >/dev/null 2>&1 || error "Docker is not installed."
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed."

# Check .env file
if [ ! -f ".env" ]; then
    warn ".env not found. Copying .env.example..."
    cp .env.example .env
    error "Please edit .env with your credentials and run again."
fi

# Load env
set -a; source .env; set +a

# Create required directories
log "Creating directories..."
mkdir -p docker/ssl
mkdir -p uploads/{videos,images,temp}
mkdir -p logs
mkdir -p /tmp/uploads

# Generate self-signed SSL if not exists (for dev)
if [ ! -f "docker/ssl/fullchain.pem" ]; then
    warn "SSL certs not found. Generating self-signed (dev only)..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/ssl/privkey.pem \
        -out docker/ssl/fullchain.pem \
        -subj "/C=US/ST=CA/L=SF/O=EduStream/CN=localhost" 2>/dev/null
    log "Self-signed SSL certs generated."
fi

# Pull latest images
log "Pulling Docker images..."
docker-compose pull postgres redis 2>/dev/null || true

# Build application images
log "Building application images..."
docker-compose build --no-cache

# Start database and redis first
log "Starting database services..."
docker-compose up -d postgres redis

# Wait for postgres
log "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        log "PostgreSQL is ready!"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then error "PostgreSQL did not start in time."; fi
done

# Run migrations
log "Running database migrations..."
docker-compose run --rm backend node src/scripts/migrate.js

# Run seeds (only in development)
if [ "${NODE_ENV}" = "development" ]; then
    log "Running database seeds..."
    docker-compose run --rm backend node src/scripts/seed.js
fi

# Start all services
log "Starting all services..."
docker-compose up -d

# Wait for services
sleep 10

# Health checks
log "Running health checks..."
BACKEND_HEALTH=$(curl -sf http://localhost:4000/health 2>/dev/null || echo "FAIL")
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    log "✅ Backend is healthy"
else
    warn "⚠️  Backend health check failed. Check logs with: docker-compose logs backend"
fi

FRONTEND_HEALTH=$(curl -sf http://localhost:3000 2>/dev/null && echo "OK" || echo "FAIL")
if [ "$FRONTEND_HEALTH" = "OK" ]; then
    log "✅ Frontend is healthy"
else
    warn "⚠️  Frontend health check failed. Check logs with: docker-compose logs frontend"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "========================================"
echo ""
echo "🌐 Frontend: https://$(hostname -I | awk '{print $1}')"
echo "🔌 Backend API: http://$(hostname -I | awk '{print $1}'):4000"
echo ""
echo "📊 Admin Panel: https://$(hostname -I | awk '{print $1}')/admin"
echo "   Email: admin@edustream.com"
echo "   Password: Admin@123456 (change immediately!)"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f [service]"
echo "   Stop all: docker-compose down"
echo "   Restart: docker-compose restart [service]"
echo "   DB shell: docker-compose exec postgres psql -U $DB_USER -d $DB_NAME"
echo ""
