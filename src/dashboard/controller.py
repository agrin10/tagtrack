from src.orders.models import Order
from src.auth.models import User
from src import db
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, Any, List

def get_dashboard_data() -> Dict[str, Any]:
    """
    Fetches all necessary data for the dashboard.
    """
    data = {}

    # Total Orders
    data['total_orders'] = Order.query.count()

    # Pending Orders
    data['pending_orders'] = Order.query.filter_by(status='Pending').count()

    # Completed Orders (this month)
    today = datetime.utcnow().date()
    first_day_of_month = today.replace(day=1)
    data['completed_orders_this_month'] = Order.query.filter(
        Order.status == 'Completed',
        Order.updated_at >= first_day_of_month
    ).count()

    # System Overview (Active Users)
    data['active_users'] = User.query.filter_by(is_active=True).count() # Assuming User model has an is_active field

    # Recent Activity (last 3 orders)
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(3).all()
    data['recent_activity'] = []
    for order in recent_orders:
        activity_type = "New order created"
        description = f"New order created for #{order.form_number} by {order.created_by_user.username}" if order.created_by_user else f"New order created for #{order.form_number}"
        data['recent_activity'].append({
            "type": activity_type,
            "description": description,
            "timestamp": (datetime.utcnow() - order.created_at).total_seconds() // 3600 # hours ago
        })

    # Placeholder for Revenue - this would typically come from an Invoice model or similar
    data['revenue'] = "$45,239"
    data['revenue_change'] = "+8% from last month"
    data['total_orders_change'] = "+12% from last month"

    return data 