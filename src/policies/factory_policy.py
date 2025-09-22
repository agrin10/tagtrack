from __future__ import annotations

# Permissions for factory (production) UI and APIs


FACTORY_GROUPS = {
    "job_metrics": {"__job_metrics__"},
    "machine_data": {"__machine_data__"},
    "production_steps": {"__production_steps__"},
    "invoice": {"__invoice__"},  # صدور فاکتور
    "status": {"__status__" , "produced_quantity" , "peak_quantity"},    # وضعیت و بروزرسانی
}


FACTORY_ROLE_GROUPS = {
    # Read-only permissions are enforced on the frontend by disabling controls.
    # This mapping controls which groups are editable.
    "Admin": {"job_metrics", "machine_data", "production_steps", "invoice", "status"},
    "OrderManager": {"status"},  # can fully manage status; others read-only
    "Designer": set(),      # view-only
    "FactorySupervisor": {"job_metrics", "machine_data", "production_steps", "status"},  # everything except invoice
    "InvoiceClerk": {"invoice"},  # only invoice section editable
}


def _get_user_role_name(user) -> str | None:
    role = getattr(user, "role", None)
    return getattr(role, "name", None)


class FactoryPolicy:
    def __init__(self, user):
        self.user = user
        self.role_name = _get_user_role_name(user)

    def allowed_groups(self) -> set[str]:
        return FACTORY_ROLE_GROUPS.get(self.role_name, set())

    def allows_special(self, marker: str) -> bool:
        groups = self.allowed_groups()
        if not groups:
            return False
        for group in groups:
            if marker in FACTORY_GROUPS.get(group, set()):
                return True
        return False

    def to_dict(self) -> dict:
        return {
            "can_edit_job_metrics": self.allows_special("__job_metrics__"),
            "can_edit_machine_data": self.allows_special("__machine_data__"),
            "can_edit_production_steps": self.allows_special("__production_steps__"),
            "can_edit_invoice": self.allows_special("__invoice__"),
            "can_edit_status": self.allows_special("__status__"),
        }


