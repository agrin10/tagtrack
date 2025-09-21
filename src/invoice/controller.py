from flask import render_template, request, jsonify, redirect, url_for
from src.invoice.models import Payment
from src import db
from datetime import datetime
from typing import Tuple, Dict, Any
import uuid
from src.order.models import Order
import io
from flask import send_file
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import openpyxl
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from bidi.algorithm import get_display
import arabic_reshaper
import os
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side


# Register Persian font
FONT_PATH = os.path.abspath('src/static/fonts/Vazir.ttf')

pdfmetrics.registerFont(TTFont('Vazir', FONT_PATH))

# Function to reshape and display Persian text
def persian(text):
    if not text:
        return ""
    reshaped_text = arabic_reshaper.reshape(text)
    return get_display(reshaped_text)




def invoice_list(page: int = 1, per_page: int = 10, search: str = None, status: str = None) -> Tuple[bool, Dict[str, Any]]:
    try:
        query = Payment.query

        if search:
            query = query.filter(
                db.or_(
                    Payment.customer_name.ilike(f'%{search}%'),
                    db.cast(Payment.form_number, db.String).ilike(f'%{search}%')
                )
            )

        if status and status.lower() != 'all':
            query = query.filter(db.func.lower(Payment.status) == status.lower())

        query = query.order_by(Payment.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        invoices_list = [payment.to_dict() for payment in pagination.items]

        return True, {
            "message": "Orders retrieved successfully",
            "payments": invoices_list,
            "total": pagination.total,
            "pagination": pagination
        }
        

    except Exception as e:
        print(f"Error retrieving orders: {str(e)}")
        return False, {"error": f"Failed to retrieve orders: {e}"}



def generate_invoice_file(order_id, quantity, cutting_cost,
                          number_of_cuts,
                          peak_quantity, peak_width, Fee, notes, row_number=None):
    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order:
        return False , {"message": f"Order ID {order_id} does not exist."}

    try:
        # Ensure all numeric inputs are cast correctly
        quantity = int(quantity)
        cutting_cost = float(cutting_cost)
        number_of_cuts = int(number_of_cuts)
        peak_quantity = float(peak_quantity)
        peak_width = float(peak_width)
        Fee = float(Fee)

        # Generate invoice number
        last_invoice = Payment.query.order_by(Payment.id.desc()).first()
        new_invoice_number_id = (last_invoice.id if last_invoice else 0) + 1
        invoice_number = f"INV-{datetime.utcnow().year}-{new_invoice_number_id:03d}"

        unit_price = peak_quantity * peak_width * Fee
        total_price = (unit_price * cutting_cost) + number_of_cuts

        new_invoice = Payment(
            order_id=order_id,
            invoice_number=invoice_number,
            unit_price=unit_price,
            quantity=quantity,
            cutting_cost=cutting_cost,
            number_of_cuts=number_of_cuts,
            peak_quantity=peak_quantity,
            peak_width=peak_width,
            Fee=Fee,
            row_number=row_number,
            total_price=total_price,
            status='Generated',
            notes=notes
        )

        db.session.add(new_invoice)
        order.invoiced = True  # Mark order as invoiced
        db.session.commit()
        return True, "Invoice added successfully"

    except Exception as e:
        return False, f"Something went wrong: {e}"

def save_factory_invoice(order_id, quantity, cutting_cost,
                        number_of_cuts,
                        peak_quantity, peak_width, Fee, notes, row_number=None, created_by=None):
    """
    Save invoice data from factory processing tab to payment table.
    This function is specifically designed for the factory processing workflow.
    """
    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order:
        return False, {"message": f"Order ID {order_id} does not exist."}

    try:
        # Check if invoice already exists for this order
        existing_invoice = Payment.query.filter_by(order_id=order_id).first()
        if existing_invoice:
            return False, {"message": f"Invoice already exists for order {order_id}."}

        # Validate required fields
        if not quantity or not peak_quantity or not peak_width or not Fee:
            return False, {"message": "Required fields (quantity, peak_quantity, peak_width, Fee) cannot be empty."}

        # Ensure all numeric inputs are cast correctly
        try:
            quantity = int(quantity) if quantity else 0
            cutting_cost = float(cutting_cost) if cutting_cost else 0.0
            number_of_cuts = int(number_of_cuts) if number_of_cuts else 0
            peak_quantity = float(peak_quantity) if peak_quantity else 0.0
            peak_width = float(peak_width) if peak_width else 0.0
            Fee = float(Fee) if Fee else 0.0
            row_number = int(row_number) if row_number else None
        except (ValueError, TypeError) as e:
            return False, {"message": f"Invalid numeric value: {e}"}

        # Validate that values are positive
        if quantity <= 0 or peak_quantity <= 0 or peak_width <= 0 or Fee <= 0:
            return False, {"message": "Quantity, peak_quantity, peak_width, and Fee must be positive values."}

        # Generate invoice number
        last_invoice = Payment.query.order_by(Payment.id.desc()).first()
        new_invoice_number_id = (last_invoice.id if last_invoice else 0) + 1
        invoice_number = f"INV-{datetime.utcnow().year}-{new_invoice_number_id:03d}"

        # Calculate prices
        unit_price = peak_quantity * peak_width * Fee
        total_price = (unit_price * quantity) + cutting_cost + number_of_cuts

        new_invoice = Payment(
            order_id=order_id,
            invoice_number=invoice_number,
            unit_price=unit_price,
            quantity=quantity,
            cutting_cost=cutting_cost,
            number_of_cuts=number_of_cuts,
            peak_quantity=peak_quantity,
            peak_width=peak_width,
            Fee=Fee,
            row_number=row_number,
            total_price=total_price,
            status='Generated',
            notes=notes or "Generated from factory processing",
            created_by=created_by
        )

        db.session.add(new_invoice)
        order.invoiced = True  # Mark order as invoiced
        db.session.commit()
        
        return True, {
            "message": "Invoice saved successfully from factory processing",
            "invoice_number": invoice_number,
            "total_price": total_price
        }

    except Exception as e:
        db.session.rollback()
        return False, f"Error saving factory invoice: {e}"

def get_invoice_for_order(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get invoice data for a specific order to populate factory processing modal.
    """
    try:
        invoice = Payment.query.filter_by(order_id=order_id).first()
        if not invoice:
            return False, {"message": "No invoice found for this order"}
        
        return True, {
            "message": "Invoice data retrieved successfully",
            "invoice": invoice.to_dict()
        }
        
    except Exception as e:
        print(f"Error retrieving invoice for order {order_id}: {str(e)}")
        return False, {"error": f"Failed to retrieve invoice: {str(e)}"}

def view_invoice(invoice_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Get a specific invoice by its ID.
    """
    try:
        payment = Payment.query.get(invoice_id)
        if not payment:
            return False, {"error": "invoice not found"}
        
        return True, {
            "message": "invoice retrieved successfully",
            "invoice": payment.to_dict()
        }
        
    except Exception as e:
        print(f"Error retrieving invoice {invoice_id}: {str(e)}")
        return False, {"error": f"Failed to retrieve invoice: {str(e)}"}

def send_invoice(invoice_id):
    invoice = Payment.query.get_or_404(invoice_id)
    # Logic to send invoice (e.g., email the invoice)
    invoice.status = 'sent' # Assuming 'sent' is a valid status
    db.session.commit()
    return jsonify({"message": f"Invoice {invoice.invoice_number} sent successfully"})

def download_invoice(invoice_id, file_type):
    success, data = view_invoice(invoice_id)
    if not success or not data:
        return False, None

    invoice = data["invoice"]

    if file_type == 'pdf':
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Header
        p.setFont("Vazir", 22)
        p.setFillColor(colors.darkblue)
        p.drawRightString(width - 50, height - 60, persian("فاکتور"))

        p.setFont("Vazir", 12)
        p.setFillColor(colors.black)
        p.drawRightString(width - 50, height - 90, persian(f"تاریخ: {invoice['issue_date'][:10]}"))
        p.drawRightString(width - 50, height - 110, persian(f"شماره فاکتور: {invoice['invoice_number']}"))
        p.drawRightString(width - 50, height - 130, persian(f"شماره فرم: {invoice.get('form_number', '---')}"))

        p.setStrokeColor(colors.lightgrey)
        p.setLineWidth(0.5)
        p.line(50, height - 140, width - 50, height - 140)

        # Content
        y_start = height - 180
        line_height = 20
        labels_left = [
            (persian("قیمت واحد"), f"{invoice['unit_price']}"),
            (persian("تعداد تولیدی"), f"{invoice['quantity']}"),
            (persian("تعداد پیک"), f"{invoice['peak_quantity']}"),
            (persian("ردیف"), f"{invoice.get('row_number', '---')}"),
        ]
        labels_right = [
            (persian("هزینه برش"), f"{invoice['cutting_cost']}"),
            (persian("قیمت کل"), f"{invoice['total_price']}"),
            (persian("وضعیت"), persian(invoice['status'])),
            (persian("یادداشت"), persian(invoice['notes'] or "---")),
        ]

        p.setFont("Vazir", 11)
        for i, (label, value) in enumerate(labels_left):
            y = y_start - (i * line_height)
            p.drawRightString(width - 350, y, label + ":")
            p.setFont("Vazir", 10)
            p.drawRightString(width - 450, y, str(value))
            p.setFont("Vazir", 11)

        for i, (label, value) in enumerate(labels_right):
            y = y_start - (i * line_height)
            p.drawRightString(width - 80, y, label + ":")
            p.setFont("Vazir", 10)
            p.drawRightString(width - 180, y, str(value))
            p.setFont("Vazir", 11)

        # Footer
        p.setStrokeColor(colors.lightgrey)
        p.line(50, 80, width - 50, 80)
        p.setFont("Vazir", 9)
        p.setFillColor(colors.grey)
        p.drawRightString(width - 50, 65, persian("با تشکر از خرید شما"))
        p.drawString(50, 65, persian("تولید شده توسط سیستم فاکتور AM"))

        p.showPage()
        p.save()
        buffer.seek(0)

        return True, send_file(
            buffer,
            as_attachment=True,
            download_name=f"{invoice['invoice_number']}.pdf",
            mimetype='application/pdf'
        )

    elif file_type == 'excel':
        FIELD_TRANSLATIONS = {
            "invoice_number": "شماره فاکتور",
            "issue_date": "تاریخ صدور",
            "form_number": "شماره فرم",
            "unit_price": "قیمت واحد",
            "quantity": "تعداد تولیدی",
            "peak_quantity": "تعداد پیک",
            "row_number": "ردیف",
            "cutting_cost": "هزینه برش",
            "total_price": "قیمت کل",
            "status": "وضعیت",
            "notes": "یادداشت",
        }

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "فاکتور"

        # Styling objects
        rtl_alignment = Alignment(horizontal='right', readingOrder=2)
        header_fill = PatternFill(start_color="0d6efd", end_color="0d6efd", fill_type="solid")
        odd_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
        font_bold = Font(name='Tahoma', bold=True)
        font_normal = Font(name='Tahoma')

        # Write headers
        headers = [FIELD_TRANSLATIONS[key] for key in FIELD_TRANSLATIONS]
        ws.append(headers)
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col)
            cell.alignment = rtl_alignment
            cell.font = font_bold
            cell.fill = header_fill

        # Write values
        values = [invoice.get(key, "---") for key in FIELD_TRANSLATIONS]
        ws.append(values)
        for col, value in enumerate(values, start=1):
            cell = ws.cell(row=2, column=col)
            cell.alignment = rtl_alignment
            cell.font = font_normal
            cell.fill = odd_fill  # light gray background

        # Adjust column widths
        for col in ws.columns:
            max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(12, max_length + 3)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return True, send_file(
            buffer,
            as_attachment=True,
            download_name=f"{invoice['invoice_number']}.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    return False, None

def create_payment_for_order(order, payment_info):
    invoice_number = str(uuid.uuid4()).split('-')[0].upper()

    unit_price = payment_info.get('unit_price', 0)
    quantity = order.quantity or 1
    cutting_cost = payment_info.get('cutting_cost', 0)
    peak_quantity = payment_info.get('peak_quantity', quantity)
    peak_width = payment_info.get('peak_width', 0)
    fee = payment_info.get('Fee', 0)
    total_price = (unit_price * quantity) + cutting_cost + fee

    payment = Payment(
        order_id=order.id,
        invoice_number=invoice_number,
        unit_price=unit_price,
        quantity=quantity,
        cutting_cost=cutting_cost,
        number_of_cuts=payment_info.get('number_of_cuts'),
        peak_quantity=peak_quantity,
        peak_width=peak_width,
        Fee=fee,
        row_number=payment_info.get('row_number'),
        total_price=total_price,
        status='Generated',
        notes='Auto-generated when order marked as completed',
        created_by=order.created_by
    )

    db.session.add(payment)
    db.session.commit()


def export_all():
    """
    Export all invoices to an Excel file.
    """
    try:
        FIELD_TRANSLATIONS = {
            "invoice_number": "شماره فاکتور",
            "issue_date": "تاریخ صدور",
            "form_number": "شماره فرم",
            "unit_price": "قیمت واحد",
            "quantity": "تعداد تولیدی",
            "peak_quantity": "تعداد پیک",
            "row_number": "ردیف",
            "cutting_cost": "هزینه برش",
            "total_price": "قیمت کل",
            "status": "وضعیت",
            "notes": "یادداشت",
        }

        invoices = Payment.query.order_by(Payment.created_at.desc()).all()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "فاکتورها"
        default_fill = PatternFill(fill_type=None)  # for rows that don't use odd_fill

        # Styling objects
        rtl_alignment = Alignment(horizontal='right', readingOrder=2)
        header_fill = PatternFill(start_color="0d6efd", end_color="0d6efd", fill_type="solid")
        odd_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
        font_bold = Font(name='Tahoma', bold=True)
        font_normal = Font(name='Tahoma')

        # Write headers
        headers = [FIELD_TRANSLATIONS[key] for key in FIELD_TRANSLATIONS]
        ws.append(headers)
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col)
            cell.alignment = rtl_alignment
            cell.font = font_bold
            cell.fill = header_fill

        # Write invoice rows
        for idx, invoice in enumerate(invoices, start=2):
            inv_dict = invoice.to_dict()
            values = [inv_dict.get(key, "---") for key in FIELD_TRANSLATIONS]
            ws.append(values)
            for col, value in enumerate(values, start=1):
                cell = ws.cell(row=idx, column=col)
                cell.alignment = rtl_alignment
                cell.font = font_normal
                cell.fill = odd_fill if idx % 2 == 0 else default_fill
        # Adjust column widths
        for col in ws.columns:
            max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(12, max_length + 3)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name="all_invoices.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) , 200
    except Exception as e:
        return jsonify({"error": f"Failed to export invoices: {e}"}), 500