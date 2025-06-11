from typing import Tuple, Dict, Any, List
import traceback
from datetime import datetime, date, timezone

from src import db
from src.production.models import JobMetric, Machine, ShiftType
from src.orders.models import Order

def get_order_details_for_modal(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get detailed information for a single order to populate the modal.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}
        
        order_dict = order.to_dict()
        # Add job metrics to the order dict
        success, metrics_data = get_job_metrics_for_order(order_id)
        order_dict['job_metrics'] = metrics_data.get('metrics', [])

        # Add machine data to the order dict
        success_machine, machine_data = get_machine_data_for_order(order_id)
        order_dict['machine_data'] = machine_data.get('machines', [])

        return True, {"message": "Order details retrieved successfully", "order": order_dict}
    except Exception as e:
        print(f"Error retrieving order details for modal: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve order details: {str(e)}"}

def update_order_production_status(order_id: int, form_data: Dict[str, Any], user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Updates the production status (stage, progress, notes) and job metrics of an order.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}

        current_stage = form_data.get('current_stage')
        progress_percentage = form_data.get('progress_percentage')
        factory_notes = form_data.get('factory_notes')
        job_metrics_data = form_data.get('job_metrics', [])
        machine_data = form_data.get('machine_data', [])
        production_duration = form_data.get('production_duration')

        if current_stage is not None:
            order.current_stage = str(current_stage).strip()
            order.status = str(current_stage).strip() # Also update the main status
        if progress_percentage is not None:
            try:
                order.progress_percentage = int(progress_percentage)
            except ValueError:
                return False, {"error": "Invalid progress percentage"}
        if factory_notes is not None:
            order.factory_notes = str(factory_notes).strip()
        
        if production_duration is not None:
            order.production_duration = str(production_duration).strip()

        # Save job metrics
        save_job_metrics_for_order(order_id, job_metrics_data, user_id)

        # Save machine data
        save_machine_data_for_order(order_id, machine_data, user_id)

        order.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return True, {"message": "Order production status and metrics updated successfully", "order": order.to_dict()}

    except Exception as e:
        db.session.rollback()
        print(f"Error updating order production status for order {order_id}: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to update order production status: {str(e)}"}

def get_job_metrics_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get all job metrics for a specific order.
    """
    try:
        metrics = JobMetric.query.filter_by(order_id=order_id).all()
        if not metrics:
            return True, {"message": "No job metrics found for this order", "metrics": []}
        
        return True, {
            "message": "Job metrics retrieved successfully",
            "metrics": [metric.to_dict() for metric in metrics]
        }
    except Exception as e:
        print(f"Error retrieving job metrics: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve job metrics: {str(e)}"}

def save_job_metrics_for_order(order_id: int, metrics_data: List[Dict[str, Any]], user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Save or update job metrics for an order. This will delete existing metrics and add new ones.
    """
    try:
        # Verify order exists
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}

        # Delete existing metrics for this order
        JobMetric.query.filter_by(order_id=order_id).delete()
        db.session.flush() # Ensure deletions are processed before adding new ones

        added_metrics = []
        for data in metrics_data:
            # Validate data before casting
            try:
                package_count = int(data.get('package_count', 0))
                package_value = float(data.get('package_value', 0))
                roll_count = int(data.get('roll_count', 0))
                meterage = float(data.get('meterage', 0))
            except ValueError:
                return False, {"error": "Invalid numeric data for job metrics"}

            metric = JobMetric(
                order_id=order_id,
                package_count=package_count,
                package_value=package_value,
                roll_count=roll_count,
                meterage=meterage,
                created_by=user_id
            )
            db.session.add(metric)
            added_metrics.append(metric.to_dict())

        db.session.commit()
        
        return True, {
            "message": "Job metrics saved successfully",
            "metrics": added_metrics
        }

    except ValueError as e:
        db.session.rollback()
        return False, {"error": f"Invalid data format: {str(e)}"}
    except Exception as e:
        db.session.rollback()
        print(f"Error saving job metrics: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to save job metrics: {str(e)}"}

