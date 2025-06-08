from src.orders import order_bp
from src.orders.controller import add_order, get_orders
from flask import redirect, render_template, request, jsonify, flash, url_for
from flask_login import login_required, current_user
from src.utils.decorators import role_required

@order_bp.route('/')
@login_required
@role_required('Admin', "OrderManager")
def order_list():
    success, response = get_orders()
    
    if request.is_json:
        if success:
            return jsonify(response)
        # If error and it was a JSON request, return JSON error
        return jsonify(response), 400
    
    if not success:
        flash(response.get('error', 'Failed to load orders'), 'error')
        return render_template('order-list.html', orders=[], total=0)
    
    return render_template('order-list.html', 
                         orders=response['orders'], 
                         total=response['total'])

@order_bp.route('/', methods=['GET', 'POST'])
@login_required
@role_required('Admin', "OrderManager")
def create_order():
    if request.method == 'POST':
        try:
            # Get form data and handle both JSON and form data
            if request.is_json:
                form_data = request.get_json()
            else:
                # Convert form data to dict and handle empty strings
                form_data = {
                    key: value if value != '' else None 
                    for key, value in request.form.items()
                }
            
            # Debug print
            print("Received form data:", form_data)
            
            # Add order
            success, response = add_order(form_data)
            
            if success:
                if request.is_json:
                    return jsonify(response), 201
                flash('Order created successfully!', 'success')
                return redirect(url_for('order.order_list'))
            else:
                if request.is_json:
                    return jsonify(response), 400
                flash(response.get('error', 'Failed to create order'), 'error')
                
        except Exception as e:
            print(f"Error in create_order route: {str(e)}")
            error_msg = "An error occurred while processing your request"
            if request.is_json:
                return jsonify({"error": error_msg}), 500
            flash(error_msg, 'error')
    
    # Handle GET requests (for showing the form)
    if request.is_json:
        # If it's a GET request for JSON, return Method Not Allowed
        return jsonify({"error": "GET method not allowed for JSON requests on this endpoint"}), 405
    
    return render_template('order-list.html')
    