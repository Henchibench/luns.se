# Luns.se 2.0 Deployment Strategy

## Overview

Modern deployment of luns.se using Next.js frontend with FastAPI backend, containerized with Docker.

## Architecture

### Current Setup (Luns.se 2.0)

- **Domain**: `luns.se`
- **Containers**:
  - `luns-modern` (Next.js frontend on port 3000)
  - `luns-api` (FastAPI backend on port 8000)
  - `luns-redis` (Redis cache on port 6379)
- **Technology**: Next.js + FastAPI + Redis + Docker

## Deployment Process

### Production Deployment

```bash
# Build and run all services
docker-compose up -d --build
# Accessible at: luns.se
```

### Development Environment

```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up --build
# Accessible at:
# - Frontend: localhost:3000
# - API: localhost:8000
# - Redis: localhost:6379
```

## Development Workflow

### Making Changes

1. Edit code in your development environment
2. Test using `docker-compose.dev.yml`
3. Push changes to repository
4. Deploy to production with `docker-compose.yml`

### Container Management

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Clean rebuild
docker-compose down && docker-compose up --build -d
```

## Monitoring & Health Checks

- **Frontend**: `https://luns.se`
- **API**: `https://luns.se/api`
- **API Documentation**: `https://luns.se/api/docs`
- **Health Check**: `https://luns.se/api/health`

## Resource Usage

- **Total RAM**: ~400MB (Next.js + FastAPI + Redis)
- **Disk Space**: ~800MB for containers and images
- **CPU**: Low usage, spikes during menu scraping

## Benefits of Current Architecture

1. **Modern Tech Stack**: React/Next.js frontend with Python FastAPI backend
2. **Containerized**: Easy deployment and scaling with Docker
3. **Cached Data**: Redis for fast response times
4. **Responsive Design**: Works perfectly on mobile and desktop
5. **API-First**: Clean separation between frontend and backend
6. **Development Ready**: Hot reload and easy local development
7. **Premium UX**: Cinematic animations and smooth transitions throughout

## 🎭 Animation System Architecture

### Core Animation Philosophy

Luns.se 2.0 implements a **cinematic animation system** designed to create a premium, restaurant-quality user experience that feels smooth and professional.

### Animation Categories

#### **1. 🎬 Cinematic Loading Experience**

- **Food Photography Background**: Random hero images from professional food photographers
- **Camera Focus Effect**: Background blurs from 0px to 3px as content comes into focus
- **Title Animation**: "Luns.se" starts large and centered, moves to header position
- **Content Reveal**: Main content scrolls up from bottom with physics-based easing
- **Seamless Transition**: Loading screen matches main design for smooth handoff

#### **2. 🎪 Restaurant Card Filtering Animations**

- **Two-Phase System**: Proper exit/enter animations for smooth card transitions
- **Fade + Scale Effects**: Cards fade in at 95% scale, fade out with gentle shrinking
- **Height Collapse**: Smooth max-height animation prevents "popping" of remaining cards
- **Staggered Appearance**: 150ms delays between cards for waterfall effect
- **Perfect Timing Sync**: 400ms animations with synchronized DOM updates

#### **3. 🎨 Filter Panel Interactions**

- **Roller Blind Effect**: Filter panel slides down with max-height + opacity transitions
- **Staggered Elements**: Food type buttons appear with 50ms delays between each
- **Checkbox Bounce**: Selection feedback with scale animation on checkboxes
- **Restaurant List**: Smooth slide-in effects for each restaurant option
- **Button State Feedback**: Hover scaling and ring effects for active selections

#### **4. 📋 Menu Content Transitions**

- **Container-Level Animation**: Smooth opacity + scale transitions during content changes
- **Non-Stuttering Design**: Simplified approach eliminates complex state management
- **Food Type Filtering**: Smooth dimming (60% opacity, 98% scale) during content updates
- **400ms Duration**: Balanced between responsive feel and smooth visual quality

### Technical Implementation

#### **CSS Architecture**

```css
/* Core keyframe animations */
@keyframes fadeInScale {
  /* Restaurant card entrance */
}
@keyframes fadeOutScale {
  /* Restaurant card exit with height collapse */
}
@keyframes slideInUp {
  /* Filter elements staggered appearance */
}
@keyframes checkboxBounce {
  /* Selection feedback */
}
```

#### **State Management**

- **Two-Phase Animation States**: Separate exit and enter phases prevent instant DOM removal
- **Ref-Based Tracking**: `useRef` prevents circular dependencies in animation loops
- **Timing Coordination**: JavaScript timeouts synchronized with CSS animation durations
- **Conflict Resolution**: Single animation system per element to prevent competing effects

#### **Performance Optimizations**

- **Hardware Acceleration**: Transform-based animations use GPU acceleration
- **Smooth Curves**: `cubic-bezier` easing for natural motion feel
- **Minimal Reflows**: Transform and opacity changes avoid layout thrashing
- **Optimized Triggers**: State changes batched to minimize animation conflicts

### Animation Best Practices Applied

1. **Consistent Timing**: All related animations use synchronized durations
2. **Easing Harmony**: Consistent easing functions across similar interaction types
3. **Staggered Delight**: Waterfall effects create engaging sequences
4. **Performance First**: GPU-accelerated transforms for 60fps smoothness
5. **Accessible Motion**: Respects user motion preferences (future enhancement)

## Backup & Recovery

### Database/Cache Recovery

```bash
# Redis data is stored in Docker volume
docker-compose down
docker volume ls | grep redis
# Volume persists between restarts
```

### Application Recovery

```bash
# Quick recovery from any issues
docker-compose down
docker-compose pull  # Get latest images
docker-compose up -d --build
```

## 🚀 Modern Version Feature Roadmap

### ✅ Completed Infrastructure

- [x] **Core Setup**: Next.js + FastAPI + Redis containerized deployment
- [x] **Development Environment**: Working docker-compose.dev.yml
- [x] **Production Environment**: Working docker-compose.yml with proper builds
- [x] **Basic UI**: Modern interface with Tailwind CSS
- [x] **Menu Display**: Restaurant cards with full menu functionality
- [x] **InfoBanner**: Weather, jokes, countdown timer, week number
- [x] **Progressive Loading**: Skeleton screens and performance optimization
- [x] **Filter System**: Comprehensive filtering with food types, restaurants, search
- [x] **Action Bar**: Cohesive button grouping (Filter, Favoriter, View toggle)
- [x] **Google Maps Integration**: Restaurant location with embedded maps
- [x] **Social Links**: Website and Instagram integration
- [x] **Caching System**: Client-side caching with 5-minute expiration
- [x] **Cinematic Loading Experience**: Food photography backgrounds with camera focus animation
- [x] **Premium Animation System**: Smooth restaurant card filtering with fade + scale effects
- [x] **Advanced Filter Animations**: Roller blind dropdown effects with staggered item appearance
- [x] **Menu Content Transitions**: Smooth content changes when filtering food types
- [x] **Optimized Animation Timing**: Eliminated jank and stuttering in all transitions

### 🎭 Animation System Achievements

The animation system represents a significant upgrade to the user experience:

**🎬 Cinematic Quality**: Professional food photography backgrounds with camera-focus effects create a restaurant-quality first impression.

**⚡ Performance Optimized**: All animations use GPU acceleration and are synchronized to prevent conflicts, ensuring 60fps smoothness.

**🎪 Interactive Delight**: Every user interaction (filtering, selecting, hovering) provides immediate visual feedback with carefully choreographed timing.

**🔧 Technical Excellence**: Two-phase animation architecture handles complex state transitions without DOM popping or stuttering.

**📱 Production Ready**: All animations are optimized for performance and work seamlessly across devices.

### 🎯 Next Development Priorities

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
- [x] **Smooth animations for panel transitions** ✨
- [x] **Button hover and loading states** ✨
- [x] **Dark mode toggle in action bar**
- [x] **Cinematic loading experience with food photography** ✨
- [x] **Premium filter animations with staggered effects** ✨
- [x] **Smooth restaurant card transitions** ✨
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

## 🎯 Ready to Start Development!

With both development and production environments working perfectly, you're now ready to tackle the feature roadmap. The **Favoriter functionality** looks like a great next step since it's high-impact and relatively straightforward to implement!
