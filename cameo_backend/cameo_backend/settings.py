"""
Django settings for cameo_backend project.

Generated by 'django-admin startproject' using Django 5.1.6.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

import os
from pathlib import Path
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-zw_vi%c5q1%))fk@kenz%lcuaxnp1wlmdgnjxv^34%v5mu+zzy')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Update ALLOWED_HOSTS to include Railway domains
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,.up.railway.app').split(',')
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")


# Application definition

INSTALLED_APPS = [
    'daphne',  # Add this first for ASGI
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'channels',
    'game',
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}

ASGI_APPLICATION = 'cameo_backend.asgi.application'

# Redis configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

if REDIS_URL:
    try:
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    'hosts': [REDIS_URL],
                },
            },
        }
    except:
        # Fallback to in-memory channels if Redis isn't available
        pass

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add WhiteNoise back
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
CORS_ALLOW_ALL_ORIGINS = True  # For development only
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

ROOT_URLCONF = 'cameo_backend.urls'

# Static files configuration
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# Check if React static directories exist
react_static_dir = BASE_DIR / "cameo_frontend" / "build" / "static"
if react_static_dir.exists():
    print(f"React static directory found at {react_static_dir}")
    STATICFILES_DIRS.append(react_static_dir)
else:
    print(f"React static directory not found at {react_static_dir}")

STATIC_ROOT = BASE_DIR / "staticfiles"

# Template directories
FRONTEND_DIR = BASE_DIR / "cameo_frontend" / "build"
print(f"Frontend directory: {FRONTEND_DIR}")
print(f"Frontend directory exists: {FRONTEND_DIR.exists()}")

# Debug static file paths
for static_dir in STATICFILES_DIRS:
    print(f"Static directory: {static_dir}")
    print(f"Static directory exists: {static_dir.exists()}")

# Use simplified storage for static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# WhiteNoise configuration
WHITENOISE_ROOT = STATIC_ROOT
WHITENOISE_INDEX_FILE = True
WHITENOISE_USE_FINDERS = True

# Add whitenoise for serving files with correct MIME types
WHITENOISE_MIME_TYPES = {
    'application/pdf': 'application/pdf',
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/gif': 'image/gif',
    'image/svg+xml': 'image/svg+xml',
    'image/x-icon': 'image/x-icon',
    'text/javascript': 'application/javascript',
    'application/javascript': 'application/javascript',
    'application/json': 'application/json',
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / "templates",  # Our templates first
            BASE_DIR / "cameo_frontend" / "build",  # React build directory
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cameo_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

# Use Railway's DATABASE_URL if available
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///' + str(BASE_DIR / 'db.sqlite3'),
        conn_max_age=600
    )
}

# Print the database configuration (for debugging)
db_config = dict(DATABASES['default'])
if 'PASSWORD' in db_config:
    db_config['PASSWORD'] = '********'  # Mask password for security
print(f"Database config: {db_config}")


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/



# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# Allow framing for static files (e.g., PDFs)
X_FRAME_OPTIONS = 'SAMEORIGIN'  # Change from DENY to SAMEORIGIN

# Add Railway-specific settings
CSRF_TRUSTED_ORIGINS = ['https://*.up.railway.app']

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.template': {  # Add logging for templates
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.staticfiles': {  # Add logging for static files
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}