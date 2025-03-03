import os
from django.core.asgi import get_asgi_application
from daphne.cli import CommandLineInterface

# Set the Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'cameo_backend.settings'

# Ensure settings are configured
import django
django.setup()

# Get the ASGI application
application = get_asgi_application()

if __name__ == '__main__':
    # Define the arguments explicitly
    args = ['-b', '0.0.0.0', '-p', '8000', 'cameo_backend.asgi:application']
    CommandLineInterface().run(args)