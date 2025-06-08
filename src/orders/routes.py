from src.orders import order_bp
from src.orders.controller import add_order, get_orders , get_order_by_id, delete_order_by_id , update_order_id, duplicate_order
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
                return redirect(url_for('order.order_list'))

                
        except Exception as e:
            print(f"Error in create_order route: {str(e)}")
            error_msg = "An error occurred while processing your request"
            if request.is_json:
                return jsonify({"error": error_msg}), 500
            flash(error_msg, 'error')
            return redirect(url_for('order.order_list'))

    
    # Handle GET requests (for showing the form)
    if request.is_json:
        # If it's a GET request for JSON, return Method Not Allowed
        return jsonify({"error": "GET method not allowed for JSON requests on this endpoint"}), 405
    
    return render_template('order-list.html')
    
@order_bp.route('/<id>')
def get_order_id(id):
    """
    Get a specific order by its ID.
    """
    success, response = get_order_by_id(id)
    
    if success:
        return jsonify(response)
    return jsonify(response), 404

    
@order_bp.route('/<id>', methods=['DELETE'])
@login_required
@role_required('Admin', "OrderManager")
def delete_order(id):
    """
    Delete an order by its ID.
    """
    try:
        success, response = delete_order_by_id(id)
        if success:
            return jsonify({
                "success": True,
                "message": "Order deleted successfully",
                "order_id": id
            })
        return jsonify({
            "success": False,
            "error": response.get('error', 'Failed to delete order')
        }), 400
    except Exception as e:
        print(f"Error in delete_order route: {str(e)}")
        return jsonify({
            "success": False,
            "error": "An error occurred while deleting the order"
        }), 500
@order_bp.route('/<id>', methods=['PUT', 'PATCH'])
@login_required
@role_required('Admin', "OrderManager")
def update_order(id):
    """
    Update an existing order with the provided form data.
    """
    try:
        if request.is_json:
            form_data = request.get_json()
        else:
            form_data = {
                key: value if value != '' else None 
                for key, value in request.form.items()
            }
        
        success, response = update_order_id(id, form_data)
        
        if success:
            return jsonify(response), 200
        return jsonify(response), 400
    
    except Exception as e:
        print(f"Error in update_order route: {str(e)}")
        return jsonify({"error": "An error occurred while updating the order"}), 500

@order_bp.route('/<id>/duplicate', methods=['POST'])
@login_required
@role_required('Admin', "OrderManager")
def duplicate_order_route(id):
    """
    Duplicate an existing order with a new ID.
    """
    try:
        success, response = duplicate_order(id)
        if success:
            return jsonify({
                "success": True,
                "message": "Order duplicated successfully",
                "order": response.get('order')
            })
        return jsonify({
            "success": False,
            "error": response.get('error', 'Failed to duplicate order')
        }), 400
    except Exception as e:
        print(f"Error in duplicate_order route: {str(e)}")
        return jsonify({
            "success": False,
            "error": "An error occurred while duplicating the order"
        }), 500