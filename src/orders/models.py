from src import db
from datetime import datetime, date

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    form_number = db.Column(db.Integer, nullable=False, unique=True)
    order_date = db.Column(db.Date, default=date.today)

    customer_name = db.Column(db.String(100), nullable=False)
    fabric_density = db.Column(db.Integer)
    fabric_cut = db.Column(db.Integer)
    width = db.Column(db.Float)
    height = db.Column(db.Float)
    quantity = db.Column(db.Integer)
    total_length_meters = db.Column(db.Float)

    delivery_date = db.Column(db.Date, nullable=True)
    design_specification = db.Column(db.Text)
    office_notes = db.Column(db.Text)
    factory_notes = db.Column(db.Text)

    fusing_type = db.Column(db.String(50))         # e.g. قالب تکرار, قالب جدید
    lamination_type = db.Column(db.String(50))    # e.g. براق, مات
    cut_type = db.Column(db.String(50))           # e.g. برش کامل, نیم تیغ
    label_type = db.Column(db.String(50))         # e.g. خشک, متوسط
    status = db.Column(db.String(20))

    # New columns for tracking dates and additional information
    exit_from_office_date = db.Column(db.Date, nullable=True)
    exit_from_factory_date = db.Column(db.Date, nullable=True)
    sketch_name = db.Column(db.String(255))
    file_name = db.Column(db.String(255))
    customer_note_to_office = db.Column(db.Text)

    created_by_user = db.relationship('User', backref='orders_created')
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
            "fabric_density": self.fabric_density,
            "fabric_cut": self.fabric_cut,
            "width": self.width,
            "height": self.height,
            "quantity": self.quantity,
            "total_length_meters": self.total_length_meters,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "design_specification": self.design_specification,
            "office_notes": self.office_notes,
            "factory_notes": self.factory_notes,
            "fusing_type": self.fusing_type,
            "lamination_type": self.lamination_type,
            "cut_type": self.cut_type,
            "label_type": self.label_type,
            "status": self.status,
            "exit_from_office_date": self.exit_from_office_date.isoformat() if self.exit_from_office_date else None,
            "exit_from_factory_date": self.exit_from_factory_date.isoformat() if self.exit_from_factory_date else None,
            "sketch_name": self.sketch_name,
            "file_name": self.file_name,
            "customer_note_to_office": self.customer_note_to_office,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by_id": self.created_by,
            "created_by_username": self.created_by_user.username if self.created_by_user else None
        }
