from src import db
from src.orders.models import Order
from flask_login import current_user
from datetime import datetime, date
from typing import Tuple, Dict, Any, List
import traceback
from sqlalchemy import func

def _get_next_form_number_for_year() -> int:
    current_year = datetime.now().year
    start_of_year = datetime(current_year, 1, 1)
    end_of_year = datetime(current_year, 12, 31, 23, 59, 59)

    # Query for the maximum form_number within the current year
    max_form_number = db.session.query(func.max(Order.form_number)).filter(
        Order.created_at.between(start_of_year, end_of_year)
    ).scalar()

    return (max_form_number or 0) + 1

def add_order(form_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    try:
        # Debug print the incoming data
        print("Raw form data received:", form_data)
        
        # Convert all string values to str type and strip whitespace
        form_data = {k: str(v).strip() if isinstance(v, (str, int, float)) else v 
                    for k, v in form_data.items() if v is not None}
        
        print("Processed form data:", form_data)

        # Customer name is required
        if not form_data.get('customer_name'):
            return False, {"error": "Customer name is required"}

        # Auto-generate form_number with yearly reset
        form_number = _get_next_form_number_for_year()

        # Parse dates if provided
        delivery_date = None
        if form_data.get('delivery_date'):
            try:
                delivery_date = datetime.strptime(form_data['delivery_date'], '%Y-%m-%d').date()
            except ValueError:
                return False, {"error": "Invalid delivery date format. Use YYYY-MM-DD"}

        # Convert numeric fields
        try:
            width = float(form_data['width']) if form_data.get('width') else None
            height = float(form_data['height']) if form_data.get('height') else None
            quantity = int(form_data['quantity']) if form_data.get('quantity') else None
            total_length_meters = float(form_data['total_length_meters']) if form_data.get('total_length_meters') else None
        except ValueError as e:
            return False, {"error": f"Invalid numeric value: {str(e)}"}

        # Create new order
        new_order = Order(
            form_number=form_number, # Use the auto-generated form number
            customer_name=form_data['customer_name'],
            fabric_name=form_data.get('fabric_name'),
            fabric_code=form_data.get('fabric_code'),
            width=width,
            height=height,
            quantity=quantity,
            total_length_meters=total_length_meters,
            delivery_date=delivery_date,
            design_specification=form_data.get('design_specification'),
            office_notes=form_data.get('office_notes'),
            factory_notes=form_data.get('factory_notes'),
            print_type=form_data.get('print_type'),
            lamination_type=form_data.get('lamination_type'),
            cut_type=form_data.get('cut_type'),
            label_type=form_data.get('label_type'),
            created_by=current_user.id,
            status=form_data.get('status', 'Pending'),  # Default status to 'Pending'
        )

        # Add to database
        db.session.add(new_order)
        db.session.commit()

        # Refresh the order to get the database-generated values
        db.session.refresh(new_order)

        return True, {
            "message": "Order created successfully",
            "order": new_order.to_dict()
        }

    except Exception as e:
        db.session.rollback()
        # Get the full traceback
        error_traceback = traceback.format_exc()
        print("Error creating order:")
        print(error_traceback)
        # Return the actual error message for debugging
        return False, {"error": f"Failed to create order: {str(e)}\nTraceback: {error_traceback}"}

def get_orders(page: int = 1, per_page: int = 10, search: str = None, status: str = None) -> Tuple[bool, Dict[str, Any]]:
    """
    Get all orders with their details, with pagination and optional search/status filters.
    Returns a tuple of (success, response) where response contains either the orders list or an error message.
    """
    try:
        query = Order.query

        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    Order.customer_name.ilike(f'%{search}%'),
                    db.cast(Order.form_number, db.String).ilike(f'%{search}%')
                )
            )
        
        # Apply status filter
        if status and status.lower() != 'all':
            query = query.filter(Order.status == status)

        # Order by created_at descending (newest first)
        query = query.order_by(Order.created_at.desc())
        
        # Paginate the results
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Convert orders to list of dictionaries
        orders_list = [order.to_dict() for order in pagination.items]
        
        return True, {
            "message": "Orders retrieved successfully",
            "orders": orders_list,
            "total": pagination.total,
            "pagination": pagination
        }
        
    except Exception as e:
        print(f"Error retrieving orders: {str(e)}")
        return False, {"error": "Failed to retrieve orders"}
    
def get_order_by_id(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get a specific order by its ID.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}
        
        return True, {
            "message": "Order retrieved successfully",
            "order": order.to_dict()
        }
        
    except Exception as e:
        print(f"Error retrieving order {order_id}: {str(e)}")
        return False, {"error": f"Failed to retrieve order: {str(e)}"}
    
def delete_order_by_id(order_id: int) -> Tuple[bool , Dict[str, Any]]:
    """
    Delete an order by its ID.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}
        
        db.session.delete(order)
        db.session.commit()
        
        return True, {
            "message": "Order deleted successfully"
        }
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting order {order_id}: {str(e)}")
        return False, {"error": f"Failed to delete order: {str(e)}"}
    
def update_order_id(order_id: int, form_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    """
    Update an existing order with the provided form data.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}
        
        # Update fields from form_data
        for key, value in form_data.items():
            if hasattr(order, key):
                setattr(order, key, value)
        
        # Update timestamps
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return True, {
            "message": "Order updated successfully",
            "order": order.to_dict()
        }
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating order {order_id}: {str(e)}")
        return False, {"error": f"Failed to update order: {str(e)}"}

def duplicate_order(order_id):
    """
    Duplicate an existing order with a new ID.
    """
    try:
        # Get the original order
        success, response = get_order_by_id(order_id)
        if not success:
            return False, {"error": "Order not found"}

        original_order = response.get('order')
        if not original_order:
            return False, {"error": "Order not found"}

        # Auto-generate form_number with yearly reset
        form_number = _get_next_form_number_for_year()

        # Create a copy of the order data with a new form number
        new_order_data = {
            'form_number': form_number,  # Use the auto-generated form number
            'customer_name': original_order.get('customer_name'),
            'fabric_name': original_order.get('fabric_name'),
            'fabric_code': original_order.get('fabric_code'),
            'width': original_order.get('width'),
            'height': original_order.get('height'),
            'quantity': original_order.get('quantity'),
            'total_length_meters': original_order.get('total_length_meters'),
            'print_type': original_order.get('print_type'),
            'lamination_type': original_order.get('lamination_type'),
            'cut_type': original_order.get('cut_type'),
            'label_type': original_order.get('label_type'),
            'delivery_date': original_order.get('delivery_date'),
            'status': 'Pending',  # Set status to Pending for the new order
            'design_specification': original_order.get('design_specification'),
            'office_notes': original_order.get('office_notes'),
            'factory_notes': original_order.get('factory_notes')
        }

        # Add the new order
        success, response = add_order(new_order_data)
        if success:
            return True, {"order": response.get('order')}
        return False, response

    except Exception as e:
        print(f"Error in duplicate_order: {str(e)}")
        return False, {"error": "An error occurred while duplicating the order"}