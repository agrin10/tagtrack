from flask import Flask

def create_app(config_obj = 'config.Config'):
    app = Flask(__name__ , template_folder="template" , static_folder="static" ,static_url_path='/')

    app.config.from_object(config_obj)

    return app
    
