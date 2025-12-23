"""
Development Server Runner
Run this file for development
"""

from app import app
from config import Config

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=Config.PORT,
        debug=Config.DEBUG
    )
