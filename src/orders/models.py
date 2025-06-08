from src import db
from datetime import datetime, date

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    form_number = db.Column(db.Integer, nullable=False, unique=True)
    order_date = db.Column(db.Date, default=date.today)

    customer_name = db.Column(db.String(100), nullable=False)
    fabric_name = db.Column(db.String(100))
    fabric_code = db.Column(db.String(50))
    width = db.Column(db.Float)
    height = db.Column(db.Float)
    quantity = db.Column(db.Integer)
    total_length_meters = db.Column(db.Float)

    delivery_date = db.Column(db.Date, nullable=True)
    design_specification = db.Column(db.Text)
    office_notes = db.Column(db.Text)
    factory_notes = db.Column(db.Text)

    print_type = db.Column(db.String(50))         # e.g. قالب تکرار, قالب جدید
    lamination_type = db.Column(db.String(50))    # e.g. براق, مات
    cut_type = db.Column(db.String(50))           # e.g. برش کامل, نیم تیغ
    label_type = db.Column(db.String(50))         # e.g. خشک, متوسط

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Order {self.form_number} - {self.customer_name}>"

    def to_dict(self):
        """Convert order to dictionary for JSON response"""
        return {
            "id": self.id,
            "form_number": self.form_number,
            "customer_name": self.customer_name,
            "fabric_name": self.fabric_name,
            "fabric_code": self.fabric_code,
            "width": self.width,
            "height": self.height,
            "quantity": self.quantity,
            "total_length_meters": self.total_length_meters,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "design_specification": self.design_specification,
            "office_notes": self.office_notes,
            "factory_notes": self.factory_notes,
            "print_type": self.print_type,
            "lamination_type": self.lamination_type,
            "cut_type": self.cut_type,
            "label_type": self.label_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }
