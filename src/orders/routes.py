from src.orders import order_bp
from src.orders.controller import (
    add_order, get_orders, get_order_by_id, delete_order_by_id,
    update_order_id, duplicate_order, generate_excel_report,
    upload_order_image, delete_order_image, get_order_images
)
from flask import redirect, render_template, request, jsonify, flash, url_for, send_file, current_app
from flask_login import login_required, current_user
from src.utils.decorators import role_required
from src.orders.models import db, Order
import io
import traceback
import os

@order_bp.route('/')
@login_required
@role_required('Admin', "OrderManager")
def order_list():
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
        return render_template('order-list.html', orders=[], total=0, pagination=None)
    
    return render_template('order-list.html', 
                         orders=response['orders'], 
                         total=response['total'],
                         pagination=response['pagination'])

@order_bp.route('/', methods=['GET', 'POST'])
@login_required
@role_required('Admin', "OrderManager")
def create_order():
    if request.method == 'POST':
        try:
            # Debug print request details
            print("Request method:", request.method)
            print("Request content type:", request.content_type)
            print("Request is_json:", request.is_json)
            print("Request files:", request.files)
            print("Request form:", request.form)
            
            # Check if this is an AJAX request
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.headers.get('Accept') == 'application/json'
            
            # Get form data and handle both JSON and form data
            if request.is_json:
                try:
                    form_data = request.get_json()
                    print("Parsed JSON data:", form_data)
                except Exception as e:
                    print("Error parsing JSON:", str(e))
                    return jsonify({"error": "Invalid JSON data"}), 400
                files = None
            else:
                # Convert form data to dict and handle empty strings
                try:
                    form_data = {
                        key: value if value != '' else None 
                        for key, value in request.form.items()
                    }
                    print("Parsed form data:", form_data)
                except Exception as e:
                    print("Error parsing form data:", str(e))
                    return jsonify({"error": "Invalid form data"}), 400
                
                files = request.files
                print("Files received:", files)
            
            # Validate required fields
            if not form_data.get('customer_name'):
                return jsonify({"error": "Customer name is required"}), 400
            
            # Add order with files
            try:
                success, response = add_order(form_data, files)
                print("Add order response:", success, response)
            except Exception as e:
                print("Error in add_order:", str(e))
                print("Full traceback:", traceback.format_exc())
                return jsonify({"error": f"Error creating order: {str(e)}"}), 500
            
            if success:
                if is_ajax:
                    return jsonify(response), 201
                flash('Order created successfully!', 'success')
                return redirect(url_for('order.order_list'))
            else:
                error_response = {"error": response.get('error', 'Failed to create order')}
                if is_ajax:
                    return jsonify(error_response), 400
                flash(error_response['error'], 'error')
                return redirect(url_for('order.order_list'))

        except Exception as e:
            print(f"Error in create_order route: {str(e)}")
            print("Full error details:", traceback.format_exc())
            error_msg = str(e) if request.is_json else "An error occurred while processing your request"
            error_response = {"error": error_msg}
            if is_ajax:
                return jsonify(error_response), 500
            flash(error_msg, 'error')
            return redirect(url_for('order.order_list'))

    # Handle GET requests (for showing the form)
    if request.is_json:
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
            print("Received JSON data:", form_data)
        else:
            form_data = {
                key: value if value != '' else None 
                for key, value in request.form.items()
            }
            print("Received form data:", form_data)
            
        print(f'Processing update for order {id} with data:', form_data)
        success, response = update_order_id(id, form_data)
        
        if success:
            print("Update successful:", response)
            return jsonify(response), 200
        print("Update failed:", response)
        return jsonify(response), 400
    
    except Exception as e:
        print(f"Error in update_order route: {str(e)}")
        print("Full error details:", traceback.format_exc())
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

@order_bp.route('/export/excel')
@login_required
@role_required('Admin', "OrderManager")
def export_orders_excel():
    """
    Export orders to an Excel file.
    """
    search = request.args.get('search')
    status = request.args.get('status')
    
    success, response = generate_excel_report(search=search, status=status)

    if not success:
        flash(response.get('error', 'Failed to generate Excel report'), 'error')
        return redirect(url_for('order.order_list'))

    excel_file_buffer = response.get('excel_file_buffer')
    file_name = response.get('file_name', 'orders_report.xlsx')

    return send_file(
        excel_file_buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=file_name
    )

@order_bp.route('/<int:order_id>/images', methods=['POST'])
@login_required
@role_required('Admin', "OrderManager")
def upload_image(order_id):
    """
    Upload an image for an order.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No selected file"}), 400
        
        success, response = upload_order_image(order_id, file)
        if success:
            return jsonify(response), 201
        return jsonify(response), 400
        
    except Exception as e:
        print(f"Error in upload_image route: {str(e)}")
        return jsonify({"error": "An error occurred while uploading the image"}), 500

@order_bp.route('/<int:order_id>/images', methods=['GET'])
@login_required
def get_images(order_id):
    """
    Get all images for an order.
    """
    try:
        success, response = get_order_images(order_id)
        if success:
            return jsonify(response)
        return jsonify(response), 404
        
    except Exception as e:
        print(f"Error in get_images route: {str(e)}")
        return jsonify({"error": "An error occurred while retrieving images"}), 500

@order_bp.route('/images/<int:image_id>', methods=['DELETE'])
@login_required
@role_required('Admin', "OrderManager")
def delete_image(image_id):
    """
    Delete an order image.
    """
    try:
        success, response = delete_order_image(image_id)
        if success:
            return jsonify(response)
        return jsonify(response), 404
        
    except Exception as e:
        print(f"Error in delete_image route: {str(e)}")
        return jsonify({"error": "An error occurred while deleting the image"}), 500

@order_bp.route('/images/<int:image_id>', methods=['GET'])
@login_required
def serve_image(image_id):
    """
    Serve an order image.
    """
    try:
        from src.orders.models import OrderImage
        image = OrderImage.query.get(image_id)
        if not image:
            return jsonify({"error": "Image not found"}), 404
            
        if not os.path.exists(image.file_path):
            return jsonify({"error": "Image file not found"}), 404
            
        return send_file(
            image.file_path,
            mimetype=image.mime_type,
            as_attachment=False
        )
        
    except Exception as e:
        print(f"Error in serve_image route: {str(e)}")
        return jsonify({"error": "An error occurred while serving the image"}), 500