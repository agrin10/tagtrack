from src import create_app, db , jwt
from sqlalchemy import text
from flask import render_template, redirect, url_for
import jdatetime
from datetime import datetime
from dateutil import parser

app = create_app()

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
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
    
@app.context_processor
def inject_now():
    return {'now': datetime.now()}

@app.template_filter('to_persian_date')
def to_persian_date(value=None, fmt='%Y/%m/%d %A' , now=False):
    persian_weekdays = {
        'Saturday': 'شنبه',
        'Sunday': 'یکشنبه',
        'Monday': 'دوشنبه',
        'Tuesday': 'سه‌شنبه',
        'Wednesday': 'چهارشنبه',
        'Thursday': 'پنجشنبه',
        'Friday': 'جمعه',
    }

    # If value is None, empty, or explicitly a null-like string
    if not value or str(value).lower() in ('none', 'null', ''):
        return '-'  # return a dash

    if now == True:
        date_str = datetime.now()
    try:
        # Handle string input by parsing to datetime
        if isinstance(value, str):
            value = parser.parse(value)

        if isinstance(value, datetime):
            jalali = jdatetime.datetime.fromgregorian(datetime=value)
            date_str = jalali.strftime(fmt)

            # Replace English weekday with Persian
            for en, fa in persian_weekdays.items():
                date_str = date_str.replace(en, fa)

            return date_str

    except Exception as e:
        # Optional: log the error for debugging
        print(f"[to_persian_date] Error: {e}")

    return '-'  # fallback for invalid date



if '__main__'== __name__:
    app.run(host='0.0.0.0' , port=5000 , debug=True)
