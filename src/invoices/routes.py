from src.invoices import invoice_bp
from src.invoices.controller import invoice_list , generate_invoice_file
from flask import request , jsonify , redirect , url_for , render_template , flash
from flask_login import login_required
from src.utils.decorators import role_required
from src.orders.controller import get_orders

@invoice_bp.route('/')
@login_required
@role_required('Admin', "OrderManager")
def get_invoice_list():
    """
    Endpoint to retrieve a list of invoices with pagination and optional search/status filters.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', None, type=str)
    status = request.args.get('status', None, type=str)

    sucess , orders = get_orders()
    orders = orders['orders'] if sucess else []
    orders = [order for order in orders if order.get('status') == 'Completed']   
    success, response = invoice_list(page, per_page, search, status)

    if success:
        # If the request is JSON (like from Postman or Axios), return minimal data
        if request.is_json:
            return jsonify(response["payments"]), 200
        else:
            return render_template(
                'invoice_list.html',
                orders = orders,
                invoices=response["payments"],
                total=response["total"],
                pagination=response["pagination"]
            ), 200
    else:
        return jsonify({"message": response}), 500

@invoice_bp.route('/', methods=["POST"])
@login_required
@role_required('Admin', "OrderManager")
def post_generate_invoice_file():
    if request.content_type == 'application/json':
        data = request.get_json()
    else:
        data = request.form

    try:
        order_id = int(data.get('order_id'))
        credit_card = data.get('credit_card')
        quantity = data.get('quantity')
        cutting_cost = data.get('cutting_cost')
        number_of_cuts = data.get('number_of_cuts')
        number_of_density = data.get('number_of_density')
        peak_quantity = data.get('peak_quantity')
        peak_width = data.get('peak_width')
        Fee = data.get('Fee')
        notes = data.get('notes')

        print(f'order_id {order_id}')
        success, message = generate_invoice_file(
            order_id, credit_card, quantity,
            cutting_cost, number_of_cuts, number_of_density,
            peak_quantity, peak_width, Fee, notes
        )

        if success:
            if request.is_json:
                return jsonify({"success": True, "message": message}), 200
            flash(message), 200
            return redirect(url_for('invoice.get_invoice_list')) 
        else:
            flash(message), 400
            return redirect(url_for('invoice.get_invoice_list')) 

    except Exception as e:
        return jsonify({"success": False, "message": f"Invalid input: {e}"}), 400
