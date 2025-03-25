"""
Emergency standalone Django application for diagnosing deployment issues.
This file can be run directly with `python emergency.py` to start a minimal Django app
that doesn't depend on the main application's configuration.
"""

import os
import sys
import socket
import datetime
import platform

def run_emergency_server():
    """Run a minimal Django application for emergency diagnostics."""
    from django.conf import settings
    from django.core.wsgi import get_wsgi_application
    from django.http import HttpResponse
    from django.urls import path
    
    # Configure minimal Django settings
    DEBUG = True
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Configure minimal settings
    settings.configure(
        DEBUG=DEBUG,
        SECRET_KEY='emergency-key-not-for-production',
        ALLOWED_HOSTS=['*'],
        ROOT_URLCONF=__name__,
        MIDDLEWARE=[
            'django.middleware.common.CommonMiddleware',
        ],
        INSTALLED_APPS=[
            'django.contrib.staticfiles',
        ],
        TEMPLATES=[{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [],
            'APP_DIRS': True,
            'OPTIONS': {'context_processors': []},
        }],
        STATIC_URL='/static/',
        STATIC_ROOT=os.path.join(BASE_DIR, 'staticfiles'),
        TIME_ZONE='UTC',
        USE_TZ=True,
    )
    
    # Define simple views
    def emergency_view(request):
        """Emergency diagnostic view that returns basic system information."""
        info = {
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'hostname': socket.gethostname(),
            'ip': socket.gethostbyname(socket.gethostname()),
            'python_version': sys.version,
            'platform': platform.platform(),
            'environment': {k: v for k, v in os.environ.items() 
                           if not any(secret in k.lower() for secret in ['key', 'secret', 'password', 'token'])},
            'working_directory': os.getcwd(),
            'files_in_directory': os.listdir(os.getcwd()),
        }
        
        # Create HTML response
        html = ['<!DOCTYPE html><html><head><title>Emergency Diagnostics</title>',
                '<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px}',
                'h1{background:#f44336;color:white;padding:10px}',
                'h2{color:#333;border-bottom:1px solid #eee}',
                'pre{background:#f5f5f5;padding:10px;overflow:auto;border-radius:3px}',
                'table{border-collapse:collapse;width:100%}',
                'th,td{text-align:left;padding:8px;border:1px solid #ddd}',
                'th{background:#f2f2f2}</style></head><body>',
                '<h1>Emergency Diagnostic Server</h1>',
                '<p>This is a minimal Django application running in emergency mode.</p>',
                '<h2>System Information</h2>',
                f'<p>Time: {info["timestamp"]}</p>',
                f'<p>Hostname: {info["hostname"]}</p>',
                f'<p>IP: {info["ip"]}</p>',
                f'<p>Python: {info["python_version"]}</p>',
                f'<p>Platform: {info["platform"]}</p>',
                f'<p>Working Directory: {info["working_directory"]}</p>',
                '<h2>Environment Variables</h2><table><tr><th>Key</th><th>Value</th></tr>']
        
        # Add environment variables to the response
        for key, value in sorted(info['environment'].items()):
            html.append(f'<tr><td>{key}</td><td>{value}</td></tr>')
        
        html.append('</table><h2>Files in Directory</h2><ul>')
        for file in sorted(info['files_in_directory']):
            html.append(f'<li>{file}</li>')
        
        html.append('</ul>')
        html.append('<p><a href="/health">Health Check</a> | <a href="/plain">Plain Text</a></p>')
        html.append('</body></html>')
        
        return HttpResponse(''.join(html))
    
    def health_view(request):
        """Simple health check that always returns OK."""
        return HttpResponse("OK")
    
    def plain_view(request):
        """Plain text diagnostic information."""
        info = {
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'hostname': socket.gethostname(),
            'python_version': sys.version,
            'working_directory': os.getcwd(),
        }
        
        text = [f"EMERGENCY SERVER STATUS: RUNNING",
                f"Timestamp: {info['timestamp']}",
                f"Hostname: {info['hostname']}",
                f"Python: {info['python_version']}",
                f"Working Directory: {info['working_directory']}",
                "Environment Variables:"]
        
        for key, value in sorted(os.environ.items()):
            if not any(secret in key.lower() for secret in ['key', 'secret', 'password', 'token']):
                text.append(f"  {key}: {value}")
                
        return HttpResponse("\n".join(text), content_type="text/plain")
    
    # Define URL patterns
    urlpatterns = [
        path('', emergency_view),
        path('health', health_view),
        path('plain', plain_view),
    ]
    
    # Create and run WSGI application
    application = get_wsgi_application()
    
    # Configure simple HTTP server if running directly
    if __name__ == '__main__':
        from django.core.management import execute_from_command_line
        execute_from_command_line([sys.argv[0], 'runserver', '0.0.0.0:8000'])
    
    return application

# Allows this file to be imported as a module or run directly
if __name__ == '__main__':
    run_emergency_server()
else:
    # For WSGI servers
    application = run_emergency_server() 