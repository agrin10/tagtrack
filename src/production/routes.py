from src.production import production_bp
from flask_login import login_required, current_user
from src.utils.decorators import role_required
from flask import render_template, redirect, jsonify, request, flash, url_for
from src.order.controller import get_orders
from src.production.models import JobMetric
from flask_jwt_extended import jwt_required
from src.production.controller import get_job_metrics_for_order, save_job_metrics_for_order, get_order_details_for_modal, update_order_production_status

@production_bp.route('/')
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" ,'Designer' , "FactorySupervisor")
def factory_processing():
    """
    Render the factory processing dashboard.
    """
    # Get pagination parameters from URL
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int) # Default to 10 items per page

    # Get search and status filters from URL
    search = request.args.get('search')
    status = request.args.get('status')

    success, response = get_orders(page=page, per_page=per_page, search=search, status=status)
    
    if request.is_json:
        if success:
            return jsonify(response)
        # If error and it was a JSON request, return JSON error
        return jsonify(response), 400
    
    if not success:
        flash(response.get('error', 'Failed to load orders'), 'error')
        # Pass an empty pagination object to avoid template errors
        return render_template('factory_processing.html', orders=[], total=0, pagination=None)
    
    return render_template('factory_processing.html', 
                         orders=response['orders'], 
                         total=response['total'],
                         pagination=response['pagination'],
                         search=search,
                         status=status)

@production_bp.route('/orders/<int:order_id>/details', methods=['GET'])
@login_required
@jwt_required()
@role_required('Admin', "OrderManager","Designer", "FactorySupervisor")
def get_order_details_api(order_id):
    """
    API endpoint to get detailed information for a single order for the modal.
    """
    success, response = get_order_details_for_modal(order_id)
    if success:
        return jsonify(response), 200
    return jsonify(response), 404 if "Order not found" in response.get("error", "") else 400

@production_bp.route('/orders/<int:order_id>/update-production-status', methods=['POST'])
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" ,"Designer" , "FactorySupervisor")
def update_production_status_api(order_id):
    """
    API endpoint to update an order's production status (stage, progress, notes).
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    
    form_data = request.get_json()
    success, response = update_order_production_status(order_id, form_data, current_user.id)

    if success:
        return jsonify(response), 200
    return jsonify(response), 400

@production_bp.route('/save-job-metrics', methods=['POST'])
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" ,"Designer" , "FactorySupervisor")
def save_job_metrics():
    """
    Save job metrics for an order.
    """
    try:
        order_id = request.form.get('order_id')
        if not order_id:
            flash('Order ID is required', 'error')
            return redirect(url_for('production.factory_processing'))

        metrics_data = []
        package_counts = request.form.getlist('package_count[]')
        package_values = request.form.getlist('package_value[]')
        roll_counts = request.form.getlist('roll_count[]')
        meterages = request.form.getlist('meterage[]')

        # Collect data for all rows
        for i in range(len(package_counts)):
            metrics_data.append({
                'package_count': package_counts[i],
                'package_value': package_values[i],
                'roll_count': roll_counts[i],
                'meterage': meterages[i]
            })

        success, response = save_job_metrics_for_order(order_id, metrics_data, current_user.id)
        
        if success:
            flash(response['message'], 'success')
        else:
            flash(response['error'], 'error')
        
    except Exception as e:
        flash(f'Error processing job metrics: {str(e)}', 'error')
    
    return redirect(url_for('production.factory_processing'))
