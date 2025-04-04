## luns.se 

A web application that displays and filters lunch menus from restaurants around Lindholmen Science Park in Gothenburg, Sweden.

## Features

- Real-time lunch menu scraping from the restaurants' official websites
- Filter menus by:
  - Food type
  - Specific items (burgare, mos, körv)
  - Restaurant selection
- Restaurant information including:
  - Google Maps integration
  - Website links
  - Review scores
- Caching system for improved performance
- Responsive design with Bootstrap

## Tech Stack

- **Backend**: Python/Flask
- **Frontend**: HTML, CSS, Bootstrap
- **Data Processing**: BeautifulSoup4
- **Caching**: Flask-Caching
- **Deployment**: Gunicorn

## Project Structure

luns.se/
├── app/
│ ├── init.py # Flask app initialization
│ ├── routes.py # Route handlers
│ ├── scraper.py # Menu scraping logic
│ ├── static/ # Static assets
│ │ ├── styles.css # Custom styling
│ │ └── logo.jpg
│ └── templates/ # HTML templates
│ └── index.html
├── run.py # Development server
├── wsgi.py # Production server
└── requirements.txt # Project dependencies

## Installation

1. Clone the repository:

bash
git clone https://github.com/yourusername/luns.se.git
cd luns.se

2. Create and activate a virtual environment:

bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

3. Install dependencies:

bash
pip install -r requirements.txt

## Running the Application

### Development

bash
python run.py

The application will be available at `http://localhost:5000`

### Production

bash
gunicorn wsgi:application

## Caching

The application implements a caching system with a 30-minute timeout to reduce load on the source website.

## API Reference

### Routes

- `GET /` - Main page displaying all menus
- `POST /` - Filter menus based on form submission

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Data source: [Lindholmen.se](https://lindholmen.se/)
- Restaurant information and locations
