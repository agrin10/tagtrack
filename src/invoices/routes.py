from src.invoices import invoice_bp
from src.invoices.controller import invoice_list, generate_invoice_file, download_invoice, view_invoice, send_invoice
from flask import request , jsonify , redirect , url_for , render_template , flash
from flask_login import login_required
from src.utils.decorators import role_required
from src.orders.controller import get_orders

