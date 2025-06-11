from src import db 
from datetime import datetime, date
from enum import Enum



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


