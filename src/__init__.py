from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()


def create_app(config_obj='config.Config'):
    app = Flask(__name__, template_folder="template",
                static_folder="static", static_url_path='/')

    app.config.from_object(config_obj)
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    from src.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from src.orders.routes import order_bp
    app.register_blueprint(order_bp, url_prefix='/orders')
    
    from src.dashboard.routes import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')

    from src.production.routes import production_bp
    app.register_blueprint(production_bp , url_perfix='/factory')

    from src.invoices.routes import invoice_bp
    app.register_blueprint(invoice_bp, url_prefix='/invoice')

    from src.auth.models import User, Role
    from src.orders.models import Order
    from src.production.models import Machine, JobMetric, ProductionStepLog, ProductionStepEnum

    with app.app_context():
        db.create_all()

    from src.seeders import seed_roles
    app.cli.add_command(seed_roles)

    return app

import src.auth.models      # ← this brings in Role & User
