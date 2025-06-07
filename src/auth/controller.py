from flask_login import login_user as flask_login_user
from src.auth.models import User, Role
from src import db

def authenticate_user(username, password, remember=True):
    """
    Authenticate and log in a user.
    
    :param username: The username of the user
    :param password: The password of the user
    :param remember: Whether to remember the user across sessions
    :return: Tuple of (success, response)
    """
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            return False, {"error": "User not found"}
            
        if not user.check_password(password):
            return False, {"error": "Invalid password"}
            
        flask_login_user(user, remember=remember)
        return True, {
            "message": "Login successful",
            "user": {
                "username": user.username,
                "role": user.role.name if user.role else None
            }
        }
    except Exception as e:
        return False, {"error": str(e)}

def register_user(username, password, role_name):
    """
    Register a new user with the given username, password and role.
    
    :param username: The username for the new user
    :param password: The password for the new user
    :param role_name: The name of the role (e.g. 'user', 'admin')
    :return: Tuple of (success, response)
    """
    try:
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return False, {"error": "Username already exists"}
            
        # Get or create the role
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name)
            db.session.add(role)
            
        # Create the new user
        new_user = User(username=username)
        new_user.set_password(password)
        new_user.role = role
        
        db.session.add(new_user)
        db.session.commit()
        
        return True, {"message": "User registered successfully", "user": {"username": new_user.username, "role": role.name}}
    except Exception as e:
        db.session.rollback()
        return False, {"error": str(e)}
    
    