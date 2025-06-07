# Local Development Setup for Luns.se

## Quick Start for Local Testing

### Option 1: Docker Development Setup (Recommended)

Use the special development docker-compose file that bypasses SWAG:

```bash
# Build and start all services for development
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

**Access points:**

- **Legacy Flask app**: http://localhost:5000
- **Modern Next.js app**: http://localhost:3000 (when ready)
- **Modern API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Redis**: localhost:6379

### Option 2: Individual Service Testing

If you want to test services individually:

```bash
# Test only the legacy Flask app
docker-compose -f docker-compose.dev.yml up app-legacy

# Test only the modern API
docker-compose -f docker-compose.dev.yml up api-modern redis

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

## Development vs Production

| Environment     | Config File              | Ports          | HTTPS            | Subdomains     |
| --------------- | ------------------------ | -------------- | ---------------- | -------------- |
| **Development** | `docker-compose.dev.yml` | Direct mapping | ❌ HTTP only     | ❌ None        |
| **Production**  | `docker-compose.yml`     | Through SWAG   | ✅ HTTPS + Certs | ✅ new.luns.se |

## Next Steps for Modern Frontend

Once you're ready to work on the Next.js frontend:

1. **Initialize Next.js project:**

   ```bash
   cd nextjs-luns-se
   npm install
   npm run dev  # Development server at localhost:3000
   ```

2. **Or build Docker image:**
   ```bash
   docker-compose -f docker-compose.dev.yml up app-modern
   ```

## Testing the Setup

1. **Start development stack:**

   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Verify each service:**

   - Legacy app: http://localhost:5000 (should show current luns.se)
   - API health: http://localhost:8000/health (should return JSON)
   - API docs: http://localhost:8000/docs (should show interactive API docs)

3. **Test API endpoints:**
   ```bash
   curl http://localhost:8000/menus
   curl http://localhost:8000/restaurants
   curl http://localhost:8000/food-types
   ```

## Cleanup

```bash
# Stop all development containers
docker-compose -f docker-compose.dev.yml down

# Remove volumes (if needed)
docker-compose -f docker-compose.dev.yml down -v

# Remove images (if needed)
docker-compose -f docker-compose.dev.yml down --rmi all
```

## Benefits of This Setup

✅ **No certificate issues** - Plain HTTP for local testing  
✅ **Direct port access** - Easy debugging and testing  
✅ **Isolated from production** - Different container names and volumes  
✅ **Same codebase** - Uses identical Dockerfiles as production  
✅ **Fast iteration** - Quick rebuilds and testing

## Production Deployment

When ready for production, use the original setup:

```bash
# On your server
docker-compose up -d --build
```

This will deploy:

- Legacy: https://luns.se
- Modern: https://new.luns.se (when DNS is configured)
