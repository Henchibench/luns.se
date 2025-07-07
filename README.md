# luns.se

A modern web application that displays and filters lunch menus from restaurants around Lindholmen Science Park in Gothenburg, Sweden. The project has been completely reworked with a modern architecture featuring a FastAPI backend and Next.js frontend.

## 🚀 Features

- **Real-time lunch menu scraping** from restaurants' official websites
- **Advanced filtering system**:
  - Food type filtering (vegetarian, meat, fish, etc.)
  - Search term filtering (burgare, mos, körv, etc.)
  - Restaurant selection
  - Location-based filtering
- **Modern REST API** with comprehensive documentation
- **Responsive Next.js frontend** with modern UI/UX
- **Redis caching** for improved performance
- **Docker-based deployment** with production-ready setup
- **SSL/HTTPS support** with automatic certificate management

## 🏗️ Architecture

The project now features a modern microservices architecture:

### Backend (FastAPI)
- **FastAPI** with automatic API documentation
- **Redis caching** for menu data
- **Modular scraper system** for different restaurants
- **RESTful API** with comprehensive endpoints

### Frontend (Next.js)
- **Next.js 15** with React 18
- **TypeScript** for type safety
- **Tailwind CSS** for modern styling
- **React Query** for efficient data fetching
- **Framer Motion** for smooth animations

### Infrastructure
- **Docker Compose** for containerized deployment
- **SWAG** reverse proxy with automatic SSL certificates
- **Redis** for caching and session management

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Redis** - Caching and session storage
- **BeautifulSoup4** - Web scraping
- **Uvicorn** - ASGI server

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **Framer Motion** - Animation library
- **Headless UI** - Accessible UI components

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **SWAG** - Reverse proxy with SSL
- **Cloudflare DNS** - Domain management

## 📁 Project Structure

```
luns.se/
├── api_main.py                 # FastAPI application entry point
├── app/                        # Backend application
│   ├── __init__.py
│   ├── routes.py              # Legacy Flask routes (for compatibility)
│   ├── scraper.py             # Menu scraping logic
│   ├── restaurant_data.py     # Restaurant information
│   ├── scrapers/              # Individual restaurant scrapers
│   └── utils/                 # Utility functions
├── nextjs-luns-se/            # Modern Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # React components
│   │   │   ├── utils/         # Frontend utilities
│   │   │   ├── globals.css    # Global styles
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── page.tsx       # Main page
│   │   └── ...
│   ├── public/                # Static assets
│   └── package.json
├── config/                     # SWAG configuration
├── docker-compose.yml          # Production deployment
├── docker-compose.dev.yml      # Development setup
├── Dockerfile.api             # Backend container
├── Dockerfile.modern          # Frontend container
└── requirements.txt            # Python dependencies
```

## 🚀 Quick Start

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/luns.se.git
   cd luns.se
   ```

2. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Access the applications:**
   - **Modern Next.js app**: http://localhost:3000
   - **FastAPI backend**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Legacy Flask app**: http://localhost:5000

### Production Deployment

1. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the applications:**
   - **Legacy version**: https://luns.se
   - **Modern version**: https://new.luns.se (when DNS is configured)

## 📚 API Reference

### Core Endpoints

- `GET /` - API information and available endpoints
- `GET /menus` - Get filtered lunch menus
- `GET /restaurants` - Get restaurant information
- `GET /food-types` - Get available food types
- `GET /locations` - Get available locations
- `GET /cache/status` - Get cache status
- `POST /cache/clear` - Clear cache
- `GET /health` - Health check

### Query Parameters

- `locations` - Filter by location areas
- `food_types` - Filter by food types
- `search_terms` - Search in menu items
- `restaurants` - Filter by specific restaurants

### Example Usage

```bash
# Get all menus
curl http://localhost:8000/menus

# Filter by food type
curl "http://localhost:8000/menus?food_types=vegetarian&food_types=fish"

# Search for specific items
curl "http://localhost:8000/menus?search_terms=burgare&search_terms=mos"

# Get restaurants in specific location
curl "http://localhost:8000/menus?locations=lindholmen"
```

## 🔧 Development

### Frontend Development

```bash
cd nextjs-luns-se
npm install
npm run dev
```

### Backend Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI development server
uvicorn api_main:app --reload --host 0.0.0.0 --port 8000
```

### Adding New Restaurants

1. Create a new scraper in `app/scrapers/restaurants/`
2. Add restaurant data to `app/restaurant_data.py`
3. Update the scraper registry in `app/scraper.py`

## 🐳 Docker Commands

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production
```bash
# Deploy production stack
docker-compose up -d --build

# View logs
docker-compose logs -f

# Update and restart
docker-compose down && docker-compose up -d --build
```

## 🔄 Migration from Legacy

The project maintains backward compatibility with the legacy Flask application while providing a modern API and frontend. The legacy app continues to serve at the main domain while the modern version is available at the new subdomain.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Data source: [Lindholmen.se](https://lindholmen.se/)
- Restaurant information and locations
- SWAG for SSL certificate management
- Next.js and FastAPI communities for excellent documentation
