from flask import render_template, request, jsonify, redirect, url_for
from src.invoices.models import Payment
from src import db
from datetime import datetime
from typing import Tuple, Dict, Any
import uuid
from src.orders.models import Order
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
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "pages": pagination.pages,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
                "next_num": pagination.next_num,
                "prev_num": pagination.prev_num
            }
        }

    except Exception as e:
        print(f"Error retrieving orders: {str(e)}")
        return False, {"error": f"Failed to retrieve orders: {e}"}



def generate_invoice_file(order_id, credit_card, quantity, cutting_cost,
                          number_of_cuts, number_of_density,
                          peak_quantity, peak_width, Fee, notes):
    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order:
        return False , {"message": f"Order ID {order_id} does not exist."}

    try:
        # Ensure all numeric inputs are cast correctly
        quantity = int(quantity)
        cutting_cost = float(cutting_cost)
        number_of_cuts = int(number_of_cuts)
        number_of_density = int(number_of_density)
        peak_quantity = float(peak_quantity)
        peak_width = float(peak_width)
        Fee = float(Fee)

        # Generate invoice number
        last_invoice = Payment.query.order_by(Payment.id.desc()).first()
        new_invoice_number_id = (last_invoice.id if last_invoice else 0) + 1
        invoice_number = f"INV-{datetime.utcnow().year}-{new_invoice_number_id:03d}"

        unit_price = peak_quantity * peak_width * Fee
        total_price = unit_price * (cutting_cost + number_of_cuts)

        new_invoice = Payment(
            order_id=order_id,
            credit_card=credit_card,
            invoice_number=invoice_number,
            unit_price=unit_price,
            quantity=quantity,
            cutting_cost=cutting_cost,
            number_of_cuts=number_of_cuts,
            number_of_density=number_of_density,
            peak_quantity=peak_quantity,
            peak_width=peak_width,
            Fee=Fee,
            total_price=total_price,
            status='Generated',
            notes=notes
        )

        db.session.add(new_invoice)
        db.session.commit()
        return True, "Invoice added successfully"

    except Exception as e:
        return False, f"Something went wrong: {e}"

