"""
Configuration Management
All application settings and environment variables
"""

import os
from dotenv import load_dotenv
from typing import List

# Load environment variables
load_dotenv()


class Config:
    """Application configuration"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    TESTING = os.getenv('TESTING', 'False').lower() == 'true'
    PORT = int(os.getenv('PORT', 5000))
    MAX_CONTENT_LENGTH_MB = int(os.getenv('MAX_CONTENT_LENGTH_MB', 100))
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH_MB * 1024 * 1024
    
    # Database Configuration
    DATABASE_HOST = os.getenv('DATABASE_HOST', 'employee_db')
    DATABASE_PORT = int(os.getenv('DATABASE_PORT', 5432))
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'Intimation')
    DATABASE_USER = os.getenv('DATABASE_USER', 'postgres')
    DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', 'postgres')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', 1440))  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 7))
    
    # OTP Configuration
    OTP_LENGTH = 6
    OTP_EXPIRE_MINUTES = 5
    OTP_MAX_ATTEMPTS = 3
    
    # WhatsApp Business API Configuration
    WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN', '')
    PHONE_NUMBER_ID = os.getenv('PHONE_NUMBER_ID', '')
    WHATSAPP_TEMPLATE_NAME = os.getenv('WHATSAPP_TEMPLATE_NAME', 'sending_otp')
    WHATSAPP_LEAVE_SUBMISSION_TEMPLATE = os.getenv('WHATSAPP_LEAVE_SUBMISSION_TEMPLATE', 'fawnix_notification')
    WHATSAPP_LEAVE_STATUS_TEMPLATE = os.getenv('WHATSAPP_LEAVE_STATUS_TEMPLATE', 'fawnix_notification')
    WHATSAPP_LEAVE_MANAGER_ACTION_TEMPLATE = os.getenv('WHATSAPP_LEAVE_MANAGER_ACTION_TEMPLATE', 'fawnix_notification')
    WHATSAPP_EXCEPTION_TEMPLATE = os.getenv('WHATSAPP_EXCEPTION_TEMPLATE', 'fawnix_notification')
    FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
        'FIREBASE_CREDENTIALS_JSON',
        os.getenv(
            'FIREBASE_CREDENTIALS',
            os.getenv(
                'FIREBASE_SERVICE_ACCOUNT_PATH',
                os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
            )
        )
    )
    AWAY_ALERT_COOLDOWN_MINUTES = int(os.getenv('AWAY_ALERT_COOLDOWN_MINUTES', 5))
    
    # CORS Configuration
    CORS_ORIGINS = "*"
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/app.log')
    LOG_MAX_BYTES = int(os.getenv('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    
    # Attendance Configuration
    DEFAULT_SHIFT_START = os.getenv('DEFAULT_SHIFT_START', '09:00')
    DEFAULT_SHIFT_END = os.getenv('DEFAULT_SHIFT_END', '18:00')
    LOGOUT_ALERT_TIME = os.getenv('LOGOUT_ALERT_TIME', '18:40')
    ATTENDANCE_REMINDER_TIME = os.getenv('ATTENDANCE_REMINDER_TIME', '09:55')
    LUNCH_REMINDER_TIME = os.getenv('LUNCH_REMINDER_TIME', '13:25')
    LATE_ARRIVAL_GRACE_PERIOD = int(os.getenv('LATE_ARRIVAL_GRACE_PERIOD', 15))  # minutes
    MAX_WORKING_HOURS = int(os.getenv('MAX_WORKING_HOURS', 12))
    LATE_ARRIVAL_SUBMISSION_START = os.getenv('LATE_ARRIVAL_SUBMISSION_START', '04:00')
    LATE_ARRIVAL_SUBMISSION_END = os.getenv('LATE_ARRIVAL_SUBMISSION_END', '12:00')
    EARLY_LEAVE_SUBMISSION_START = os.getenv('EARLY_LEAVE_SUBMISSION_START', '16:00')
    EARLY_LEAVE_SUBMISSION_END = os.getenv('EARLY_LEAVE_SUBMISSION_END', '18:30')
    
    # Activity/Break Configuration
    MEAL_BREAK_DURATION = int(os.getenv('MEAL_BREAK_DURATION', 60))  # minutes
    TEA_BREAK_DURATION = int(os.getenv('TEA_BREAK_DURATION', 15))  # minutes
    REST_BREAK_DURATION = int(os.getenv('REST_BREAK_DURATION', 30))  # minutes
    MAX_MEAL_BREAKS = int(os.getenv('MAX_MEAL_BREAKS', 1))
    MAX_TEA_BREAKS = int(os.getenv('MAX_TEA_BREAKS', 2))
    
    # Geocoding Configuration
    GEOCODING_SERVICE = os.getenv('GEOCODING_SERVICE', 'nominatim')
    GEOCODING_TIMEOUT = int(os.getenv('GEOCODING_TIMEOUT', 10))
    GEOCODING_API_KEY = os.getenv('GEOCODING_API_KEY', '')  # For Google Maps, Mapbox, etc.
    
    # Rate Limiting (if needed)
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'False').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', 60))
    
    # Feature Flags
    FEATURE_GEOLOCATION = os.getenv('FEATURE_GEOLOCATION', 'True').lower() == 'true'
    FEATURE_WHATSAPP_OTP = os.getenv('FEATURE_WHATSAPP_OTP', 'True').lower() == 'true'
    FEATURE_ACTIVITY_TRACKING = os.getenv('FEATURE_ACTIVITY_TRACKING', 'True').lower() == 'true'
    FCM_ENABLED = os.getenv(
        'FCM_ENABLED',
        os.getenv('FEATURE_PUSH_NOTIFICATIONS', 'False')
    ).lower() == 'true'
    FEATURE_PUSH_NOTIFICATIONS = FCM_ENABLED or os.getenv('FEATURE_PUSH_NOTIFICATIONS', 'False').lower() == 'true'
    FEATURE_MEETING_NOTES = os.getenv('FEATURE_MEETING_NOTES', 'True').lower() == 'true'

    # AI / Meeting Notes Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
    GEMINI_BASE_URL = os.getenv('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta').rstrip('/')
    GEMINI_MEETING_NOTES_MODEL = os.getenv('GEMINI_MEETING_NOTES_MODEL', 'gemini-1.5-flash').strip()
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
    OPENAI_BASE_URL = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    MEETING_NOTES_TRANSCRIPTION_MODEL = os.getenv('MEETING_NOTES_TRANSCRIPTION_MODEL', 'whisper-1').strip()
    MEETING_NOTES_COMPLETION_MODEL = os.getenv('MEETING_NOTES_COMPLETION_MODEL', 'gpt-4o-mini').strip()
    MEETING_NOTES_REQUEST_TIMEOUT = int(os.getenv('MEETING_NOTES_REQUEST_TIMEOUT', 120))
    MEETING_NOTES_MAX_UPLOAD_MB = int(os.getenv('MEETING_NOTES_MAX_UPLOAD_MB', 100))
    MEETING_NOTES_ALLOWED_EXTENSIONS = [
        extension.strip().lower()
        for extension in os.getenv(
            'MEETING_NOTES_ALLOWED_EXTENSIONS',
            'mp3,wav,m4a,mp4,mpeg,mpga,webm,ogg'
        ).split(',')
        if extension.strip()
    ]
    
    @classmethod
    def get_database_uri(cls) -> str:
        """Get PostgreSQL database URI"""
        return f"postgresql://{cls.DATABASE_USER}:{cls.DATABASE_PASSWORD}@{cls.DATABASE_HOST}:{cls.DATABASE_PORT}/{cls.DATABASE_NAME}"
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development mode"""
        return cls.DEBUG
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode"""
        return not cls.DEBUG


# Activity types enum
class ActivityType:
    """Activity types constants"""
    CHECK_IN = 'check_in'
    CHECK_OUT = 'check_out'
    MEAL_BREAK = 'meal_break'
    TEA_BREAK = 'tea_break'
    REST_BREAK = 'rest_break'
    BRANCH_VISIT = 'branch_visit'
    FIELD_VISIT = 'field_visit'
    LATE_ARRIVAL = 'late_arrival'
    EARLY_LEAVE = 'early_leave'
    
    @classmethod
    def all(cls):
        """Get all activity types"""
        return [
            cls.CHECK_IN, cls.CHECK_OUT, cls.MEAL_BREAK, cls.TEA_BREAK,
            cls.REST_BREAK, cls.BRANCH_VISIT, cls.FIELD_VISIT,
            cls.LATE_ARRIVAL, cls.EARLY_LEAVE
        ]
    
    @classmethod
    def breaks(cls):
        """Get break types"""
        return [cls.MEAL_BREAK, cls.TEA_BREAK, cls.REST_BREAK]
    
    @classmethod
    def visits(cls):
        """Get visit types"""
        return [cls.BRANCH_VISIT, cls.FIELD_VISIT]


# User roles enum
class UserRole:
    """User roles constants"""
    ADMIN = 'admin'
    USER_MANAGER = 'user_manager'
    EMPLOYEE = 'employee'
    
    @classmethod
    def all(cls):
        """Get all user roles"""
        return [cls.ADMIN, cls.USER_MANAGER, cls.EMPLOYEE]
    
    @classmethod
    def is_valid(cls, role: str) -> bool:
        """Check if role is valid"""
        return role in cls.all()
