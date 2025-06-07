# Luns.se Parallel Deployment Strategy

## Overview

This setup allows running both the current Flask-based luns.se and the new modern version simultaneously on the same server.

## Architecture

### Current Setup

- **Domain**: `luns.se`
- **Container**: `luns-legacy`
- **Technology**: Flask + Bootstrap
- **Port**: 8000 (internal)

### Modern Version

- **Domain**: `new.luns.se` or `v2.luns.se`
- **Containers**:
  - `luns-modern` (Next.js frontend on port 3000)
  - `luns-api` (FastAPI backend on port 8000)
  - `luns-redis` (Redis cache)
- **Technology**: Next.js + FastAPI + Redis

## DNS Configuration

You'll need to add DNS records for the new subdomains:

```
new.luns.se    A    [your-server-ip]
v2.luns.se     A    [your-server-ip]
```

## Deployment Process

### Current State (Before Migration)

```bash
# Only legacy app running
docker-compose up -d
# Accessible at: luns.se
```

### During Migration

```bash
# Both versions running
docker-compose up -d --build
# Accessible at:
# - luns.se (legacy)
# - new.luns.se (modern)
# - v2.luns.se (modern)
```

### After Full Migration (Future)

```bash
# Switch DNS to point luns.se to modern version
# Remove legacy container
```

## Rollback Strategy

If issues arise with the modern version:

1. The legacy version continues running unaffected
2. Can quickly remove modern containers: `docker-compose stop app-modern api-modern redis`
3. DNS changes can be reverted instantly

## Development Workflow

### Testing Modern Version

1. Make changes to modern app code
2. Push to repository
3. GitHub Actions will deploy both versions
4. Test new features at `new.luns.se`
5. Legacy version remains stable at `luns.se`

### Gradual Migration

1. **Phase 1**: Both versions running (current plan)
2. **Phase 2**: Start directing some traffic to modern version
3. **Phase 3**: Migrate DNS to point `luns.se` to modern version
4. **Phase 4**: Remove legacy container

## Monitoring

- Legacy version: `https://luns.se`
- Modern version: `https://new.luns.se`
- API docs: `https://new.luns.se/api/docs`
- Health checks:
  - Legacy: `https://luns.se/cache/status`
  - Modern: `https://new.luns.se/api/health`

## Resource Usage

- **Current**: ~200MB RAM for Flask app
- **After**: ~600MB RAM total (Flask + Next.js + API + Redis)
- **Disk**: Additional ~500MB for new containers

## Benefits

1. **Zero downtime** during migration
2. **Easy rollback** if issues occur
3. **Gradual testing** of new features
4. **User feedback** before full migration
5. **Risk mitigation** with parallel systems

## Additional Development Option

### Option 1: Docker Compose Development

```bash
docker-compose -f docker-compose.dev.yml up --build
```

This will now include the working Next.js frontend! 🚀

## 🚀 Modern Version Feature Roadmap

### ✅ Completed Features

- [x] **Core Infrastructure**: Next.js + FastAPI + Redis setup
- [x] **Basic UI**: Modern interface with Tailwind CSS
- [x] **Menu Display**: Restaurant cards with full menu functionality
- [x] **InfoBanner**: Weather, jokes, countdown timer, week number
- [x] **Progressive Loading**: Skeleton screens and performance optimization
- [x] **Filter System**: Comprehensive filtering with food types, restaurants, search
- [x] **Action Bar**: Cohesive button grouping (Filter, Favoriter, View toggle)
- [x] **Google Maps Integration**: Restaurant location with embedded maps
- [x] **Social Links**: Website and Instagram integration
- [x] **Caching System**: Client-side caching with 5-minute expiration

### 🎯 Next Steps (Priority Order)

#### **1. 💫 Favoriter Functionality**

- [ ] Save favorite restaurants to localStorage
- [ ] Show heart icons on favorited restaurant cards
- [ ] Quick filter to show only favorites in action bar
- [ ] "❤️ Dina favoriter är tomma" empty state
- [ ] Import/export favorites functionality

#### **2. 📋 View Toggle Implementation**

- [ ] **Kort view**: Current beautiful cards (already implemented)
- [ ] **Lista view**: Compact table/list format for quick scanning
- [ ] Responsive view switching based on screen size
- [ ] Remember user's preferred view in localStorage

#### **3. 📱 Mobile Optimization**

- [ ] Responsive action bar (stack buttons on small screens)
- [ ] Mobile-optimized filter panel
- [ ] Touch-friendly interactions and gestures
- [ ] Swipe gestures for restaurant cards
- [ ] Mobile-specific layout improvements

#### **4. ⚡ Power User Features**

- [ ] Keyboard shortcuts (press 'f' for filter, 'esc' to close)
- [ ] "Open now" indicators (show which restaurants are actually open)
- [ ] Quick search in action bar (separate from filter search)
- [ ] URL-based filter state (shareable filtered views)
- [ ] Print-friendly view for daily menus

#### **5. 🎨 Visual Polish & UX**

- [ ] Replace emoji icons with proper SVG icons
- [ ] Smooth animations for panel transitions
- [ ] Button hover and loading states
- [x] **Dark mode toggle in action bar**
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Loading states for individual restaurant cards

#### **6. 🔧 Advanced Features**

- [ ] Restaurant ratings and reviews
- [ ] Menu item allergies and dietary information
- [ ] Push notifications for daily menu updates
- [ ] RSS feed for menus
- [ ] Admin panel for manual menu corrections
- [ ] Analytics dashboard for popular restaurants/dishes

#### **7. 🚀 Performance & Production**

- [ ] Service worker for offline functionality
- [ ] Image optimization and lazy loading
- [ ] SEO optimization and meta tags
- [ ] Error boundaries and better error handling
- [ ] Performance monitoring and analytics
- [ ] A/B testing framework for UI improvements

### 💡 Future Ideas

- [ ] AI-powered meal recommendations based on preferences
- [ ] Integration with food delivery services
- [ ] Menu comparison tools
- [ ] Social features (share favorite dishes)
- [ ] Meal planning and shopping list generation
