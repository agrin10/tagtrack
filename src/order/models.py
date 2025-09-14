from src import db
from datetime import datetime, date

class OrderImage(db.Model):
    __tablename__ = 'order_images'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    mime_type = db.Column(db.String(100), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    order = db.relationship('Order', backref=db.backref('images', lazy=True, cascade='all, delete-orphan'))
    uploader = db.relationship('User', backref='uploaded_images')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'uploader_username': self.uploader.username if self.uploader else None
        }

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    form_number = db.Column(db.Integer, nullable=False, unique=True)
    order_date = db.Column(db.Date, default=date.today)

    customer_name = db.Column(db.String(100), nullable=False)
    fabric_density = db.Column(db.Integer)
    fabric_cut = db.Column(db.Float)
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
    current_stage = db.Column(db.String(50), default='New')
    progress_percentage = db.Column(db.Integer, default=0)

    # New columns for tracking dates and additional information
    exit_from_office_date = db.Column(db.Date, nullable=True)
    exit_from_factory_date = db.Column(db.Date, nullable=True)
    sketch_name = db.Column(db.String(255))
    file_name = db.Column(db.String(255))
    customer_note_to_office = db.Column(db.Text)
    production_duration = db.Column(db.String(256), nullable=True)
    invoiced = db.Column(db.Boolean, default=False)


    created_by_user = db.relationship('User', backref='orders_created')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    job_metrics = db.relationship('JobMetric', backref='order', cascade='all, delete-orphan', lazy=True)

    machine_logs = db.relationship('Machine', backref='order', lazy=True, cascade="all, delete-orphan")

    production_step_logs = db.relationship('ProductionStepLog', backref='order', lazy=True, cascade="all, delete-orphan")
    payments = db.relationship('Payment', back_populates='order', lazy=True , cascade="all, delete-orphan") 

    values = db.relationship('OrderValue', back_populates='order', lazy=True, cascade='all, delete-orphan')
    files = db.relationship('OrderFile', back_populates='order', lazy=True, cascade='all, delete-orphan')

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Order {self.form_number} - {self.customer_name}>"

    def to_dict(self):
        """Convert order to dictionary for JSON response"""
        # Build a dict of index: value from order_values (or values)
        value_dict = {v.value_index: v.value for v in self.values}
        values_list = [value_dict.get(i + 1, "") for i in range(8)]
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
            "current_stage": self.current_stage,
            "progress_percentage": self.progress_percentage,
            "exit_from_office_date": self.exit_from_office_date.isoformat() if self.exit_from_office_date else None,
            "exit_from_factory_date": self.exit_from_factory_date.isoformat() if self.exit_from_factory_date else None,
            "sketch_name": self.sketch_name,
            "file_name": self.file_name,
            "customer_note_to_office": self.customer_note_to_office,
            "production_duration": self.production_duration,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "images": [image.to_dict() for image in self.images],
            "created_by_id": self.created_by,
            "created_by_username": self.created_by_user.username if self.created_by_user else None,
            "job_metrics": [metric.to_dict() for metric in self.job_metrics] if self.job_metrics else [],
            "production_steps": {log.step_name.value: log.to_dict() for log in self.production_step_logs} if self.production_step_logs else {},
            "invoiced": self.invoiced,
            "values": values_list,
            "order_files": [f.to_dict() for f in self.files] if self.files else [],
        }


class OrderFile(db.Model):
    __tablename__ = 'order_files'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    display_name = db.Column(db.String(255), nullable=True)
    # Relationships
    order = db.relationship('Order', back_populates='files')
    uploader = db.relationship('User', backref='uploaded_files')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'file_name': self.file_name,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'display_name': self.display_name,
        }
    
class OrderValue(db.Model):
    __tablename__ = 'order_values'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    value_index = db.Column(db.Integer, nullable=True)  # 1-8
    value = db.Column(db.String(255), nullable=True)

    order = db.relationship('Order', back_populates='values')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'value_index': self.value_index,
            'value': self.value,
        }
    