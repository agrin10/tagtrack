from src.dashboard import dashboard_bp
from src.dashboard.controller import get_dashboard_data
from flask import render_template
from flask_login import login_required
from flask_jwt_extended import jwt_required
from src.utils.decorators import role_required

@dashboard_bp.route('/')
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" , "Designer")
def dashboard():
    data = get_dashboard_data()
    return render_template('dashboard.html', **data) 