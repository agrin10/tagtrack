from src import db
from src.orders.models import Order
from flask_login import current_user
from datetime import datetime, date
from typing import Tuple, Dict, Any, List
import traceback

def add_order(form_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    try:
        # Debug print the incoming data
        print("Raw form data received:", form_data)
        
        # Convert all string values to str type and strip whitespace
        form_data = {k: str(v).strip() if isinstance(v, (str, int, float)) else v 
                    for k, v in form_data.items() if v is not None}
        
        print("Processed form data:", form_data)

        # Validate required fields
        if not form_data.get('form_number'):
            return False, {"error": "Form number is required"}
        if not form_data.get('customer_name'):
            return False, {"error": "Customer name is required"}

        # Convert form_number to integer
        try:
            form_number = int(form_data['form_number'])
        except ValueError:
            return False, {"error": "Form number must be a number"}

        # Check if form number already exists
        existing_order = Order.query.filter_by(form_number=form_number).first()
        if existing_order:
            return False, {"error": f"Order with form number {form_number} already exists"}

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
            form_number=form_number,
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

def get_orders() -> Tuple[bool, Dict[str, Any]]:
    """
    Get all orders with their details.
    Returns a tuple of (success, response) where response contains either the orders list or an error message.
    """
    try:
        # Get all orders, ordered by created_at descending (newest first)
        orders = Order.query.order_by(Order.created_at.desc()).all()
        
        # Convert orders to list of dictionaries
        orders_list = [order.to_dict() for order in orders]
        
        return True, {
            "message": "Orders retrieved successfully",
            "orders": orders_list,
            "total": len(orders_list)
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
    
