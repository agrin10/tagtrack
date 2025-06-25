from src.orders.models import Order
from src.auth.models import User
from src import db
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, Any, List
from src.invoices.models import Payment  # Make sure this import is correct


def get_dashboard_data() -> Dict[str, Any]:
    """
    Fetches all necessary data for the dashboard.
    """
    data = {}

    # Total Orders
    data['total_orders'] = Order.query.count()
    data['total_orders_label'] = "کل سفارش‌ها"

    # Pending Orders
    data['pending_orders'] = Order.query.filter_by(status='Pending').count()
    data['pending_orders_label'] = "سفارش‌های در انتظار"

    # Completed Orders (this month)
    today = datetime.utcnow().date()
    first_day_of_month = today.replace(day=1)
    data['completed_orders_this_month'] = Order.query.filter(
        Order.status == 'Completed',
        Order.updated_at >= first_day_of_month
    ).count()
    data['completed_orders_this_month_label'] = "سفارش‌های تکمیل‌شده این ماه"

    # System Overview (Active Users)
    data['active_users'] = User.query.filter_by(is_active=True).count()
    data['active_users_label'] = "کاربران فعال"

    # Recent Activity (last 3 orders)
    recent_orders = Order.query.order_by(
        Order.created_at.desc()).limit(3).all()
    data['recent_activity'] = []
    for order in recent_orders:
        activity_type = "سفارش جدید ثبت شد"
        description = f"سفارش جدید برای شماره #{order.form_number} توسط {order.created_by_user.username}" if order.created_by_user else f"سفارش جدید برای شماره #{order.form_number}"
        data['recent_activity'].append({
            "type": activity_type,
            "description": description,
            "timestamp": int((datetime.utcnow() - order.created_at).total_seconds() // 3600),
            "timestamp_label": "ساعت پیش"
        })

    # Calculate total revenue from all paid invoices
    total_revenue = db.session.query(func.coalesce(
        func.sum(Payment.total_price), 0)).filter(Payment.status == 'Paid').scalar()
    data['revenue'] = int(total_revenue)
    data['revenue_label'] = "درآمد کل"

    # Example: Calculate revenue change (this month vs last month)
    first_day_last_month = (first_day_of_month -
                            timedelta(days=1)).replace(day=1)
    last_month_revenue = db.session.query(func.coalesce(func.sum(Payment.total_price), 0)).filter(
        Payment.status == 'Paid',
        Payment.payment_date >= first_day_last_month,
        Payment.payment_date < first_day_of_month
    ).scalar()
    this_month_revenue = db.session.query(func.coalesce(func.sum(Payment.total_price), 0)).filter(
        Payment.status == 'Paid',
        Payment.payment_date >= first_day_of_month
    ).scalar()
    if last_month_revenue:
        change = ((this_month_revenue - last_month_revenue) /
                  last_month_revenue) * 100
        data['revenue_change'] = f"{change:.2f}% نسبت به ماه گذشته"
    else:
        data['revenue_change'] = "۱۰۰٪ نسبت به ماه گذشته"

    # Example: Calculate order count change (this month vs last month)
    last_month_order_count = Order.query.filter(
        Order.status == 'Completed',
        Order.updated_at >= first_day_last_month,
        Order.updated_at < first_day_of_month
    ).count()
    this_month_order_count = Order.query.filter(
        Order.status == 'Completed',
        Order.updated_at >= first_day_of_month
    ).count()
    if last_month_order_count:
        order_count_change = (
            (this_month_order_count - last_month_order_count) / last_month_order_count) * 100
        data['total_orders_change'] = f"{order_count_change:.2f}% نسبت به ماه گذشته"
    else:
        data['total_orders_change'] = "۱۰۰٪ نسبت به ماه گذشته"

    return data
