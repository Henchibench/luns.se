from app import create_app

# Initialize the Flask application
app = create_app()

if __name__ == '__main__':
    # Run the application in debug mode and make it accessible from any network interface
    app.run(debug=True, host='0.0.0.0')
