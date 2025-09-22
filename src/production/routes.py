from src.production import production_bp
from flask_login import login_required, current_user
from src.utils.decorators import role_required
from flask import render_template, redirect, jsonify, request, flash, url_for
from src.order.controller import get_orders
from src.production.models import JobMetric
from flask_jwt_extended import jwt_required
from src.production.controller import get_job_metrics_for_order, save_job_metrics_for_order, get_order_details_for_modal, update_order_production_status


def _compute_factory_permissions(role_name: str) -> dict:
    """Return field-level factory permissions based on role name."""
    role = (role_name or '').strip()
    # Default: read-only everywhere
    perms = {
        "can_edit_job_metrics": False,
        "can_edit_machine_data": False,
        "can_edit_production_steps": False,
        "can_edit_invoice": False,
        "can_edit_status": False,
    }

    if role.lower() == 'admin':
        for k in list(perms.keys()):
            perms[k] = True
    elif role.lower() == 'ordermanager':
        perms["can_edit_status"] = True
    elif role.lower() == 'factorysupervisor':
        perms.update({
            "can_edit_job_metrics": True,
            "can_edit_machine_data": True,
            "can_edit_production_steps": True,
            "can_edit_status": True,
            # cannot edit invoice
        })
    elif role.lower() == 'designer':
        # read-only
        pass
    elif role.lower() == 'invoiceclerk':
        perms["can_edit_invoice"] = True

    return perms

@production_bp.route('/')
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" ,"Designer" , "FactorySupervisor", "InvoiceClerk")
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
@role_required('Admin', "OrderManager","Designer", "FactorySupervisor", "InvoiceClerk")
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
@role_required('Admin', "OrderManager" ,"Designer" , "FactorySupervisor", "InvoiceClerk")
def update_production_status_api(order_id):
    """
    API endpoint to update an order's production status (stage, progress, notes).
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    form_data = request.get_json()

    # Enforce field-level permissions on incoming payload
    role_name = getattr(getattr(current_user, 'role', None), 'name', '')
    perms = _compute_factory_permissions(role_name)

    # If user has no edit permission at all, block
    if not any(perms.values()):
        return jsonify({"error": "You do not have permission to update this order."}), 403

    # Drop disallowed fields from payload
    if not perms.get('can_edit_status', False):
        for k in ['current_stage', 'progress_percentage', 'factory_notes']:
            form_data.pop(k, None)
    if not perms.get('can_edit_job_metrics', False):
        form_data.pop('job_metrics', None)
    if not perms.get('can_edit_machine_data', False):
        form_data.pop('machine_data', None)
        form_data.pop('production_duration', None)
    if not perms.get('can_edit_production_steps', False):
        form_data.pop('production_steps', None)
    if not perms.get('can_edit_invoice', False):
        form_data.pop('invoice_data', None)

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


@production_bp.route('/permissions', methods=['GET'])
@login_required
@jwt_required()
@role_required('Admin', "OrderManager" ,"Designer" , "FactorySupervisor", "InvoiceClerk")
def get_factory_permissions():
    """Return field-level factory permissions for the current user."""
    role_name = getattr(getattr(current_user, 'role', None), 'name', '')
    return jsonify(_compute_factory_permissions(role_name))
