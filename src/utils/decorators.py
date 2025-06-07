# decorators.py
from functools import wraps
from flask import abort
from flask_login import current_user

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in allowed_roles:
                return abort(403)
            return f(*args, **kwargs)
        return wrapped
    return decorator
