from flask import Flask
from flask_caching import Cache
import logging

def create_app():
    # Initialize Flask application
    app = Flask(__name__)
    
    # Initialize cache with app
    cache = Cache()
    cache.init_app(app, config={'CACHE_TYPE': 'simple'})
    
    # Set up logging configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Import and initialize scraper after app and cache are set up
    from .scraper import init_scraper
    init_scraper(cache)

    # Register the main blueprint containing our routes
    from .routes import main
    app.register_blueprint(main)

    return app
