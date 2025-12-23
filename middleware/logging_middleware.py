"""
Logging Middleware
Request/response logging
"""

import logging
from logging.handlers import RotatingFileHandler
import os
from config import Config


def setup_logging(app):
    """Setup logging configuration"""
    
    # Create logs directory if not exists
    os.makedirs('logs', exist_ok=True)
    
    # File handler with UTF-8 encoding
    file_handler = RotatingFileHandler(
        Config.LOG_FILE,
        maxBytes=Config.LOG_MAX_BYTES,
        backupCount=Config.LOG_BACKUP_COUNT,
        encoding='utf-8'  # Fix Unicode errors on Windows
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # Console handler with UTF-8 encoding
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, Config.LOG_LEVEL))
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    ))
    
    # Set console encoding to UTF-8 if on Windows
    import sys
    if sys.platform == 'win32':
        try:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
        except:
            pass
    
    # Configure app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(getattr(logging, Config.LOG_LEVEL))
    
    # Configure root logger
    logging.root.setLevel(getattr(logging, Config.LOG_LEVEL))
    logging.root.addHandler(file_handler)
    logging.root.addHandler(console_handler)