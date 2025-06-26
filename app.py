from src import create_app, db , jwt
from sqlalchemy import text
from flask import render_template, redirect, url_for

app = create_app()

@jwt.expired_token_loader
def expired_token_callback():
    # flash(message='Unauthorized access', category='error')
    return redirect(url_for('auth.login'))

@jwt.unauthorized_loader
def missing_token_callback(error):
    # flash(message='Unauthorized access', category='error')
    return redirect(url_for('auth.login'))

@jwt.invalid_token_loader
def invalid_token_callback(error):
    # flash(message='Invalid token', category='error') 
    return redirect(url_for('auth.login'))


@app.route('/')
def index():
    return redirect(url_for('dashboard.dashboard'))

@app.template_filter('iran_money')
def iran_money(value):
    try:
        value = float(value)
        value = int(value) if value.is_integer() else value
        return "{:,}".format(value).replace(",", "٬")
    except Exception:
        return value


if '__main__'== __name__:
    app.run(host='0.0.0.0' , port=8080 , debug=True)
