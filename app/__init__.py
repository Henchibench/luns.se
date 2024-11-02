from flask import Flask
from flask_caching import Cache
import logging
from .scraper import init_scraper

def create_app():
    # Initialize Flask application
    app = Flask(__name__)
    
    # Initialize cache with app
    # We create the Cache instance first, then initialize it with our app
    # This allows for better configuration control
    cache = Cache()
    cache.init_app(app, config={'CACHE_TYPE': 'simple'})  # 'simple' cache type stores data in memory
    
    # Set up logging configuration
    # This will show timestamps, log levels, and messages in a consistent format
    logging.basicConfig(
        level=logging.INFO,  # Show all INFO level logs and above
        format='%(asctime)s - %(levelname)s - %(message)s',  # Time - Level - Message
        datefmt='%Y-%m-%d %H:%M:%S'  # Date/time format
    )

    # Initialize the scraper module with our cache instance
    init_scraper(cache)

    # Register the main blueprint containing our routes
    from .routes import main
    app.register_blueprint(main)

    return app
