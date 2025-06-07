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


    return app
