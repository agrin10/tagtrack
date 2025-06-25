from src import create_app, db
from sqlalchemy import text
from flask import render_template, redirect, url_for

app = create_app()


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
    
@app.route('/test-db')
def test_db():
    try:
        # Try to execute a simple query using text()
        db.session.execute(text('SELECT 1'))
        db.session.commit()
        return 'Database connection successful!'
    except Exception as e:
        db.session.rollback()
        return f'Database connection failed: {str(e)}'

if '__main__'== __name__:
    app.run(host='0.0.0.0' , port=8080 , debug=True)
