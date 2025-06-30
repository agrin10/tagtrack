from src import db
from datetime import datetime

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)  # شماره فاکتور
    credit_card = db.Column(db.String(50), nullable=False)
    unit_price = db.Column(db.Float, nullable=False)           # قیمت واحد
    quantity = db.Column(db.Integer, nullable=False)
    cutting_cost = db.Column(db.Float, default=0.0)  
    number_of_cuts = db.Column(db.Integer)
    number_of_density = db.Column(db.Integer)
    peak_quantity = db.Column(db.Float , nullable=False)
    peak_width = db.Column(db.Integer)
    Fee  = db.Column(db.Integer)

    total_price = db.Column(db.Float, nullable=False)          # قیمت نهایی = (واحد × تعداد) + هزینه برش - تخفیف + مالیات

    status = db.Column(
        db.Enum('pending', 'paid', 'failed', 'cancelled', 'Generated', 'Sent', name='payment_status_enum'),
        default='pending',
        nullable=False
    )

    notes = db.Column(db.Text, nullable=True)

    issue_date = db.Column(db.DateTime, default=datetime.utcnow) 
    payment_date = db.Column(db.DateTime, nullable=True)        
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    order = db.relationship('Order', back_populates='payments')

    def to_dict(self):
            return {
            "id": self.id,
            "order_id": self.order_id,
            "form_number": self.order.form_number if self.order else None,
            "customer_name": self.order.customer_name if self.order else None,
            "invoice_number": self.invoice_number,
            "credit_card": self.credit_card,
            "unit_price": self.unit_price,
            "quantity": self.quantity,
            "cutting_cost": self.cutting_cost,
            "number_of_cuts": self.number_of_cuts,
            "number_of_density": self.number_of_density,
            "peak_quantity": self.peak_quantity,
            "peak_width": self.peak_width,
            "Fee": self.Fee,
            "total_price": self.total_price,
            "status": self.status,
            "notes": self.notes,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "created_by": self.created_by

        }