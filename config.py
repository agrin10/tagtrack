import os
from datetime import timedelta

class Config:
    DEBUG = True
    TESTING =False
    SECRET_KEY = os.getenv('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI')

    SESSION_TYPE = 'filesystem' 
    SESSION_FILE_DIR = 'src/static/flask_sessions'  
    SESSION_PERMANENT = True  
    SESSION_USE_SIGNER = True  
    SESSION_KEY_PREFIX = 'src_' 
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access

    # Session expiration time
    PERMANENT_SESSION_LIFETIME = timedelta(days=1) 

    # JWT configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret')
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_REFRESH_COOKIE_PATH = os.getenv('JWT_REFRESH_COOKIE_PATH')
    JWT_ACCESS_COOKIE_NAME = os.getenv('JWT_ACCESS_COOKIE_NAME')
    JWT_REFRESH_COOKIE_NAME = os.getenv('JWT_REFRESH_COOKIE_NAME')
    JWT_COOKIE_SECURE = False  
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_CSRF_IN_COOKIES = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=6)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True

class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True  
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SECURE = True  
