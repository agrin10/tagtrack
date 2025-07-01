from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
from importlib import import_module
import os , dotenv



db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

jwt = JWTManager()

def create_app(config_obj='config.Config'):

    dotenv_file = ".env"
    if os.path.exists(dotenv_file):
        dotenv.load_dotenv(dotenv_file)


    app = Flask(__name__, template_folder="template",
                static_folder="static", static_url_path='/')


    app.config.from_object(config_obj)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    from src.auth.models import User, Role
    from src.order.models import Order
    from src.production.models import Machine, JobMetric, ProductionStepLog, ProductionStepEnum
    from src.invoice.models import Payment

    from src.seeders import run_seeds
    with app.app_context():
        db.create_all()
        run_seeds()

    register_blueprint(app)

    return app

def register_blueprint(app):
    url_prefixes = {
        'auth': '/auth',
        'order': '/orders',
        'dashboard': '/dashboard',
        'production': '/factory',
        'invoice': '/invoice',
    }

    modules = ('auth', 'order', 'dashboard', 'production', 'invoice')

    for module in modules:
        blueprint_module = import_module(f'src.{module}')
        blueprint_name = f'{module}_bp'

        import_module(f'src.{module}.routes')

        app.register_blueprint(getattr(blueprint_module, blueprint_name), url_prefix=url_prefixes[module])


