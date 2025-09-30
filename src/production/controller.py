from typing import Tuple, Dict, Any, List
import traceback
from datetime import datetime, date, timezone
from src import db
from src.production.models import JobMetric, Machine, ShiftType, ProductionStepLog, ProductionStepEnum, JobMetricPackageGroup, JobMetricSize, JobMetricSizePackageGroup
from src.order.models import Order, Customer
from src.invoice.models import Payment, InvoiceDraft
from src.utils import parse_date_input
import logging
from decimal import Decimal, ROUND_HALF_UP
from src.invoice.controller import save_invoice_draft, save_invoice_from_factory, get_cutting_price_for_sketch, get_number_of_cuts_for_order, _compute_press_cost_one_time
from decimal import Decimal, InvalidOperation


PRESS_UNIT_COST = Decimal('350')  # one-time press fee if condition met


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

        # Add invoice data to the order dict
        success_invoice, invoice_data = get_invoice_data_for_order(order_id)
        order_dict['invoice_data'] = invoice_data.get('invoice', {})

        return True, {"message": "Order details retrieved successfully", "order": order_dict}
    except Exception as e:
        print(f"Error retrieving order details for modal: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve order details: {str(e)}"}

def get_invoice_data_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get invoice data for a specific order (both actual invoices and drafts).
    If no invoice or draft exists, auto-generate one using save_invoice_draft().
    When auto-generating or when a draft exists, include lamination_cost = 350
    if press logs require it.
    """
    try:
        # Check for actual invoice first
        invoice = Payment.query.filter_by(order_id=order_id).first()
        if invoice:
            return True, {
                "message": "Invoice data retrieved successfully",
                "invoice": invoice.to_dict(),
                "has_actual_invoice": True,
                "has_draft": False
            }

        # Check for invoice draft if no actual invoice exists
        draft = InvoiceDraft.query.filter_by(order_id=order_id).first()
        if draft:
            # --- Sync number_of_cuts and lamination_cost from logs ---
            number_of_cuts = get_number_of_cuts_for_order(order_id)
            updated = False
            if draft.number_of_cuts != number_of_cuts:
                draft.number_of_cuts = number_of_cuts
                updated = True

            # Compute press/lamination cost using helper (Decimal)
            try:
                press_cost_decimal = _compute_press_cost_one_time(order_id)
            except Exception:
                # In case helper raises, treat as no press cost
                press_cost_decimal = None

            lamination_cost_from_press = None
            try:
                if press_cost_decimal is not None:
                    # ensure positive numeric value
                    if isinstance(press_cost_decimal, Decimal):
                        if press_cost_decimal > 0:
                            lamination_cost_from_press = float(press_cost_decimal)
                    else:
                        # if helper returned float/int
                        if float(press_cost_decimal) > 0:
                            lamination_cost_from_press = float(press_cost_decimal)
            except (InvalidOperation, ValueError, TypeError):
                lamination_cost_from_press = None

            # Only set lamination_cost from press logs if draft has no meaningful lamination_cost
            try:
                draft_lamination_value = float(draft.lamination_cost) if draft.lamination_cost not in (None, '') else None
            except (ValueError, TypeError):
                draft_lamination_value = None

            if lamination_cost_from_press is not None and (draft_lamination_value is None or draft_lamination_value == 0.0):
                draft.lamination_cost = lamination_cost_from_press
                updated = True

            if updated:
                draft.updated_at = datetime.now(timezone.utc)
                db.session.commit()

            return True, {
                "message": "Invoice draft data retrieved successfully",
                "invoice": draft.to_dict(),
                "has_actual_invoice": False,
                "has_draft": True
            }

        # No invoice or draft found -> auto-generate a draft from order static data via helper
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found to auto-generate draft"}
        number_of_cuts = get_number_of_cuts_for_order(order_id)
        cutting_cost = get_cutting_price_for_sketch(order.sketch_name)

        # Compute press/lamination cost using helper (Decimal)
        press_cost_decimal = _compute_press_cost_one_time(order_id)
        if press_cost_decimal and press_cost_decimal > 0:
            lamination_cost_value = float(press_cost_decimal)
        else:
            lamination_cost_value = float(getattr(order, "lamination_cost", 0.0) or 0.0)

        defaults = {
            'quantity': order.produced_quantity or 0,
            'cutting_cost': cutting_cost or 0.0,
            'number_of_cuts': number_of_cuts,
            'number_of_density': 0,
            'peak_quantity': getattr(order, 'peak_quantity', None) or 0.0,
            'lamination_cost': lamination_cost_value,
            'peak_width': getattr(order, 'width', None) or 0.0,
            'Fee': (order.customer.fee if getattr(order, 'customer', None) else None),
            'row_number': None,
            'notes': 'Auto-generated draft from order data'
        }

        result = save_invoice_draft(order_id, defaults, order.created_by)
        if result.get('success'):
            draft = InvoiceDraft.query.filter_by(order_id=order_id).first()
            return True, {
                "message": "Invoice draft auto-generated from order data",
                "invoice": draft.to_dict() if draft else {},
                "has_actual_invoice": False,
                "has_draft": True
            }
        else:
            return False, {"error": result.get('message', 'Failed to auto-generate invoice draft')}

    except Exception as e:
        db.session.rollback()
        print(f"Error retrieving invoice for order {order_id}: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to retrieve invoice: {str(e)}"}


def update_order_production_status(order_id: int, form_data: Dict[str, Any], user_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Updates the production status (stage, progress, notes) and job metrics of an order.
    Also handles invoice data if provided.
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

        # 🔹 NEW: Update peak quantity directly from status form
        peak_quantity = form_data.get('peak_quantity')
        if peak_quantity is not None:
            try:
                peak_quantity = form_data.get('peak_quantity')
                if peak_quantity is not None:
                    try:
                        order.peak_quantity = float(peak_quantity)
                    except ValueError:
                        return False, {"error": "Invalid peak quantity"}
            except ValueError:
                return False, {"error": "Invalid peak quantity"}
        produced_quantity = form_data.get('produced_quantity')
        if produced_quantity is not None:
            try:
                order.produced_quantity = float(produced_quantity)
            except ValueError:
                return False, {"error": "Invalid peak quantity"}

        # Invoice data from factory processing
        invoice_data = form_data.get('invoice_data', {})
        should_save_invoice = invoice_data.get('should_save_invoice', False)

        if current_stage is not None:
            order.current_stage = str(current_stage).strip()
            # Also update the main status
            order.status = str(current_stage).strip()

            # If status is completed or shipped, automatically set progress to 100%
            if str(current_stage).strip() in ['Completed', 'تکمیل شده', 'Shipped', 'ارسال شده']:
                order.progress_percentage = 100
            elif progress_percentage is not None:
                try:
                    order.progress_percentage = int(progress_percentage)
                except ValueError:
                    return False, {"error": "Invalid progress percentage"}
        elif progress_percentage is not None:
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
        save_production_step_logs_for_order(
            order_id, production_steps_data, user_id)

        # Handle invoice data - generate actual invoice when status is "Completed"
        invoice_result = None
        is_completed = str(current_stage).strip() in ['Completed', 'تکمیل شده']

        if should_save_invoice and invoice_data:
            if is_completed:
                # Generate actual invoice when order is completed
                invoice_result = save_invoice_from_factory(
                    order_id, invoice_data, user_id)
            else:
                # Save invoice data as draft/placeholder for later completion
                invoice_result = save_invoice_draft(
                    order_id, invoice_data, user_id)
        elif is_completed:
            # If order is completed but no invoice_data flag provided, attempt to
            # promote draft to invoice, or generate from order defaults.
            existing_draft = InvoiceDraft.query.filter_by(
                order_id=order_id).first()
            if existing_draft:
                draft_data = {
                    'quantity': existing_draft.quantity or (order.quantity or 0),
                    'cutting_cost': existing_draft.cutting_cost or 0.0,
                    'number_of_cuts': existing_draft.number_of_cuts or 0,
                    'lamination_cost': existing_draft.lamination_cost or 0,
                    'peak_quantity': existing_draft.peak_quantity or getattr(order, 'peak_quantity', 0.0) or 0.0,
                    'peak_width': existing_draft.peak_width or getattr(order, 'width', 0.0) or 0.0,
                    'Fee': existing_draft.Fee or (getattr(order.customer, 'fee', 0.0) if getattr(order, 'customer', None) else 0.0),
                    'row_number': existing_draft.row_number,
                    'notes': existing_draft.notes or 'Generated from completed order'
                }
                invoice_result = save_invoice_from_factory(
                    order_id, draft_data, user_id)
            else:
                # Build sensible defaults from order
                defaults = {
                    'quantity': order.quantity or 0,
                    'cutting_cost': 0.0,
                    'number_of_cuts': 0,
                    'lamination_cost': 0,
                    'peak_quantity': getattr(order, 'peak_quantity', 0.0) or 0.0,
                    'peak_width': getattr(order, 'width', 0.0) or 0.0,
                    'Fee': (getattr(order.customer, 'fee', 0.0) if getattr(order, 'customer', None) else 0.0),
                    'row_number': None,
                    'notes': 'Generated from completed order'
                }
                # Only attempt creation if required values are positive
                if defaults['quantity'] > 0 and defaults['peak_quantity'] > 0 and defaults['peak_width'] > 0 and defaults['Fee'] > 0:
                    invoice_result = save_invoice_from_factory(
                        order_id, defaults, user_id)

        order.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        response_message = "Order production status and metrics updated successfully"
        if invoice_result and invoice_result.get('success'):
            if is_completed:
                response_message += f". Invoice {invoice_result.get('invoice_number')} created successfully."
            else:
                response_message += ". Invoice data saved as draft for completion."

        return True, {
            "message": response_message,
            "order": order.to_dict(),
            "invoice_result": invoice_result,
            "is_completed": is_completed
        }

    except Exception as e:
        db.session.rollback()
        print(
            f"Error updating order production status for order {order_id}: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to update order production status: {str(e)}"}


def get_job_metrics_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get all job metrics for a specific order (returns nested sizes and package groups).
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
    Save or update job metrics for an order. Deletes existing metrics and adds new ones,
    supporting both 'single' and 'sizes' modes.
    """
    try:
        order = Order.query.get(order_id)
        if not order:
            return False, {"error": "Order not found"}

        # Fetch existing metrics and delete (to ensure cascade relationships removed)
        existing_metrics = JobMetric.query.filter_by(order_id=order_id).all()
        for m in existing_metrics:
            db.session.delete(m)
        db.session.flush()

        added_metrics = []
        for idx, data in enumerate(metrics_data or []):
            # default mode
            mode = str(data.get('mode', 'single')).strip()

            metric = JobMetric(
                order_id=order_id,
                mode=mode,
                created_by=user_id
            )
            db.session.add(metric)
            db.session.flush()  # to get metric.id for child rows

            # --- SINGLE (no sizes) mode ---
            if mode == 'single':
                # package_groups: list of {pack_size, count}
                pkg_groups = data.get('package_groups', [])
                total_package_count = 0
                for g in pkg_groups:
                    try:
                        pack_size = int(g.get('pack_size'))
                        count = int(g.get('count'))
                    except Exception:
                        db.session.rollback()
                        return False, {"error": f"Invalid package group numeric values in metric {idx}"}
                    pg = JobMetricPackageGroup(
                        job_metric_id=metric.id,
                        pack_size=pack_size,
                        count=count
                    )
                    db.session.add(pg)
                    total_package_count += count

                # optional legacy/aggregate fields (if provided)
                try:
                    metric.package_count = int(data.get('package_count')) if data.get(
                        'package_count') is not None else (total_package_count or None)
                except Exception:
                    metric.package_count = total_package_count or None

                try:
                    metric.package_value = float(data.get('package_value')) if data.get(
                        'package_value') is not None else None
                except Exception:
                    metric.package_value = None

                # roll_count and meterage at row-level
                try:
                    metric.roll_count = int(data.get('roll_count')) if data.get(
                        'roll_count') is not None else None
                except Exception:
                    metric.roll_count = None
                try:
                    metric.meterage = float(data.get('meterage')) if data.get(
                        'meterage') is not None else None
                except Exception:
                    metric.meterage = None

            # --- SIZES mode ---
            elif mode == 'sizes':
                sizes_in = data.get('sizes', [])
                for s_idx, s in enumerate(sizes_in):
                    name = s.get('name')
                    try:
                        size_roll = int(s.get('roll_count')) if s.get(
                            'roll_count') is not None else None
                    except Exception:
                        db.session.rollback()
                        return False, {"error": f"Invalid roll_count for size {s_idx} in metric {idx}"}
                    try:
                        size_meter = float(s.get('meterage')) if s.get(
                            'meterage') is not None else None
                    except Exception:
                        db.session.rollback()
                        return False, {"error": f"Invalid meterage for size {s_idx} in metric {idx}"}

                    size_row = JobMetricSize(
                        job_metric_id=metric.id,
                        name=name,
                        roll_count=size_roll,
                        meterage=size_meter
                    )
                    db.session.add(size_row)
                    db.session.flush()

                    # package_groups inside size
                    for pg_idx, pg in enumerate(s.get('package_groups', [])):
                        try:
                            pg_pack_size = int(pg.get('pack_size'))
                            pg_count = int(pg.get('count'))
                        except Exception:
                            db.session.rollback()
                            return False, {"error": f"Invalid package group numbers for size {s_idx}, group {pg_idx} in metric {idx}"}

                        size_pg = JobMetricSizePackageGroup(
                            size_id=size_row.id,
                            pack_size=pg_pack_size,
                            count=pg_count
                        )
                        db.session.add(size_pg)

                # In sizes mode, we keep metric.roll_count and meterage None (or you can compute aggregates if needed)
                metric.roll_count = None
                metric.meterage = None

            else:
                db.session.rollback()
                return False, {"error": f"Unknown metric mode '{mode}' in metric index {idx}"}

            db.session.flush()
            added_metrics.append(metric.to_dict())

        db.session.commit()
        return True, {"message": "Job metrics saved successfully", "metrics": added_metrics}

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
        db.session.flush()  # Ensure deletions are processed before adding new ones

        added_machines = []
        for data in machine_data:
            # Validate and cast data
            try:
                start_time_str = data.get('start_time')
                end_time_str = data.get('end_time')

                # Combine with today's date for datetime objects
                today = date.today()
                start_time = datetime.strptime(
                    f"{today} {start_time_str}", "%Y-%m-%d %H:%M") if start_time_str else None
                end_time = datetime.strptime(
                    f"{today} {end_time_str}", "%Y-%m-%d %H:%M") if end_time_str else None

                starting_quantity = int(data.get('starting_quantity', 0)) if data.get(
                    'starting_quantity') else 0
                remaining_quantity = int(data.get('remaining_quantity', 0)) if data.get(
                    'remaining_quantity') else 0
                shift_type_str = data.get('shift_type')
                # Convert to uppercase to match the Enum definition
                shift_type = ShiftType(
                    shift_type_str.lower()) if shift_type_str else None
                # Validate against ShiftType enum
                if shift_type not in [s for s in ShiftType]:
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
                starting_quantity=starting_quantity,
                remaining_quantity=remaining_quantity,
                shift_type=shift_type,  # Now passing an Enum member
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
        db.session.flush()  # Ensure deletions are processed before adding new ones

        added_logs = []
        for step_name_str, data in step_data.items():
            # Validate data before casting
            try:
                # Convert string to Enum member
                step_name = ProductionStepEnum(step_name_str)
                worker_name = data.get('worker_name')
                date_str = data.get('date')
                member_count = data.get('member_count')

                # Parse date (supports both Jalali and Gregorian formats)
                date_obj = parse_date_input(date_str) if date_str else None

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

        # --- NEW: Update invoice draft with latest number_of_cuts, lamination_cost, and cutting_cost ---
        number_of_cuts = get_number_of_cuts_for_order(order_id)
        lamination_cost = float(_compute_press_cost_one_time(order_id))
        order = Order.query.get(order_id)
        cutting_cost = get_cutting_price_for_sketch(
            order.sketch_name) if order and hasattr(order, "sketch_name") else 0.0

        draft = InvoiceDraft.query.filter_by(order_id=order_id).first()
        if draft:
            draft.number_of_cuts = number_of_cuts
            draft.lamination_cost = lamination_cost
            draft.cutting_cost = cutting_cost
            draft.updated_at = datetime.now(timezone.utc)
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
