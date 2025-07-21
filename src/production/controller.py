from typing import Tuple, Dict, Any, List
import traceback
from datetime import datetime, date, timezone

from src import db
from src.production.models import JobMetric, Machine, ShiftType, ProductionStepLog, ProductionStepEnum
from src.order.models import Order

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

        # Add production step logs to the order dict
        success_steps, step_data = get_production_step_logs_for_order(order_id)
        order_dict['production_steps'] = step_data.get('production_steps', {})

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
        production_steps_data = form_data.get('production_steps', {})

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

        # Save production step logs
        save_production_step_logs_for_order(order_id, production_steps_data, user_id)

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

def get_machine_data_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get all machine data for a specific order.
    """
    try:
        machines = Machine.query.filter_by(order_id=order_id).all()
        if not machines:
            return True, {"message": "No machine data found for this order", "machines": []}
        
        return True, {
            "message": "Machine data retrieved successfully",
            "machines": [machine.to_dict() for machine in machines]
        }
    except Exception as e:
        print(f"Error retrieving machine data: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve machine data: {str(e)}"}

def save_machine_data_for_order(order_id: int, machine_data: List[Dict[str, Any]], user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Save or update machine data for an order. This will delete existing machine entries and add new ones.
    """
    try:
        # Verify order exists
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}

        # Delete existing machine entries for this order
        Machine.query.filter_by(order_id=order_id).delete()
        db.session.flush() # Ensure deletions are processed before adding new ones

        added_machines = []
        for data in machine_data:
            # Validate and cast data
            try:
                start_time_str = data.get('start_time')
                end_time_str = data.get('end_time')

                # Combine with today's date for datetime objects
                today = date.today()
                start_time = datetime.strptime(f"{today} {start_time_str}", "%Y-%m-%d %H:%M") if start_time_str else None
                end_time = datetime.strptime(f"{today} {end_time_str}", "%Y-%m-%d %H:%M") if end_time_str else None

                remaining_quantity = int(data.get('remaining_quantity', 0)) if data.get('remaining_quantity') else 0
                shift_type_str = data.get('shift_type')
                # Convert to uppercase to match the Enum definition
                shift_type = ShiftType(shift_type_str.lower()) if shift_type_str else None
                if shift_type not in [s for s in ShiftType]: # Validate against ShiftType enum
                    return False, {"error": f"Invalid shift type: {shift_type_str}"}

            except ValueError as e:
                return False, {"error": f"Invalid data format for machine entry: {str(e)}"}
            except KeyError as e:
                return False, {"error": f"Missing data for machine entry: {str(e)}"}

            machine = Machine(
                order_id=order_id,
                worker_name=data.get('worker_name'),
                start_time=start_time,
                end_time=end_time,
                remaining_quantity=remaining_quantity,
                shift_type=shift_type, # Now passing an Enum member
                created_by=user_id
            )
            db.session.add(machine)
            added_machines.append(machine.to_dict())

        db.session.commit()
        
        return True, {
            "message": "Machine data saved successfully",
            "machines": added_machines
        }

    except ValueError as e:
        db.session.rollback()
        return False, {"error": f"Invalid data format: {str(e)}"}
    except Exception as e:
        db.session.rollback()
        print(f"Error saving machine data: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to save machine data: {str(e)}"}

def get_production_step_logs_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get all production step logs for a specific order.
    """
    try:
        logs = ProductionStepLog.query.filter_by(order_id=order_id).all()
        if not logs:
            return True, {"message": "No production step logs found for this order", "production_steps": {}}
        
        step_data = {}
        for log in logs:
            step_data[log.step_name.value] = log.to_dict()
    
        return True, {
            "message": "Production step logs retrieved successfully",
            "production_steps": step_data
        }
    except Exception as e:
        print(f"Error retrieving production step logs: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve production step logs: {str(e)}"}

def save_production_step_logs_for_order(order_id: int, step_data: Dict[str, Any], user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Save or update production step logs for an order. This will delete existing logs and add new ones.
    """
    try:
        # Verify order exists
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}
    
        # Delete existing logs for this order
        ProductionStepLog.query.filter_by(order_id=order_id).delete()
        db.session.flush() # Ensure deletions are processed before adding new ones
    
        added_logs = []
        for step_name_str, data in step_data.items():
            # Validate data before casting
            try:
                step_name = ProductionStepEnum(step_name_str) # Convert string to Enum member
                worker_name = data.get('worker_name')
                date_str = data.get('date')
                member_count = data.get('member_count')
    
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    
            except ValueError as e:
                return False, {"error": f"Invalid data format for production step entry: {str(e)}"}
            except KeyError as e:
                return False, {"error": f"Missing data for production step entry: {str(e)}"}
    
            log = ProductionStepLog(
                order_id=order_id,
                step_name=step_name,
                worker_name=worker_name,
                date=date_obj,
                member_count=member_count,
                created_by=user_id
            )
            db.session.add(log)
            added_logs.append(log.to_dict())
    
        db.session.commit()
        
        return True, {
            "message": "Production step logs saved successfully",
            "production_steps": added_logs
        }
    
    except ValueError as e:
        db.session.rollback()
        return False, {"error": f"Invalid data format: {str(e)}"}
    except Exception as e:
        db.session.rollback()
        print(f"Error saving production step logs: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to save production step logs: {str(e)}"}
