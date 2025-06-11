from src import db 
from datetime import datetime, date
from enum import Enum

class ShiftType(Enum):
    day = 'day'
    night = 'night'
class ProductionStepEnum(Enum):
    MONGANE = "mongane"
    AHAR = "ahar"
    PRESS = "press"
    BRESH = "bresh"

class JobMetric(db.Model):
    __tablename__ = 'job_metrics'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)

    package_count = db.Column(db.Integer, nullable=True)
    package_value = db.Column(db.Float, nullable=True)

    roll_count = db.Column(db.Integer, nullable=True)
    meterage = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # optional

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'package_count': self.package_count,
            'package_value': self.package_value,
            'roll_count': self.roll_count,
            'meterage': self.meterage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }


class Machine(db.Model):
    __tablename__ = 'machine'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)

    worker_name = db.Column(db.String(256), nullable=True)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    remaining_quantity = db.Column(db.Integer, nullable=True)
    shift_type = db.Column(db.Enum(ShiftType), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'worker_name': self.worker_name,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'remaining_quantity': self.remaining_quantity,
            'shift_type': self.shift_type.value if self.shift_type else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }

class ProductionStepLog(db.Model):
    __tablename__ = 'production_step_log'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)

    step_name = db.Column(db.Enum(ProductionStepEnum, name="production_step_enum", native_enum=False), nullable=False)

    worker_name = db.Column(db.String(255), nullable=False)
    date = db.Column(db.Date, nullable=False)
    member_count = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "step_name": self.step_name.value,  # Access enum value for JSON
            "worker_name": self.worker_name,
            "date": self.date.isoformat(),
            "member_count": self.member_count
        }