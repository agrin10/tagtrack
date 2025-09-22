from __future__ import annotations

# Centralized field-groups and role-to-groups mapping for Order permissions


ORDER_FIELD_GROUPS = {
    "basic-info": {
        "customer_name",
        "sketch_name",
        "customer_fee",
        "form_number",
        "start_form_number",
        "status",
        "current_stage",
        "progress_percentage",
        "delivery_date",
    },
    "notes": {
        "office_notes",
        "factory_notes",
        "customer_note_to_office",
        "design_specification",
    },
    "design": {
        "design_specification",
    },
    "dimensions": {
        "fabric_density",
        "fabric_cut",
        "width",
        "height",
        "quantity",
        "total_length_meters",
    },
    "pictures": {"__images__" , "images"},  # special operation: image upload/delete
    "cuts": {
        "cut_type",
        "fusing_type",
        "lamination_type",
        "label_type",
    },
    "exit_from_office": {"exit_from_office_date"},
    "exit_from_factory": {"exit_from_factory_date"},
    "factory-notes": {"factory_notes"},
    "coloring": {"__values__", "peak_quantity"},  # special operation: values[] -> OrderValue rows
    "files": {"__files__"},      # special operation: order_files[] upload/delete
}


ORDER_ROLE_GROUPS = {
    "Admin": {"ALL"},
    "OrderManager": {"basic-info", "notes", "dimensions", "pictures", "cuts"},
    "Designer": {"exit_from_office", "design", "coloring", "files","pictures" },
    "FactorySupervisor": {"exit_from_factory", "factory-notes" },
    "InvoiceClerk": set(),  # view-only
}


def _get_user_role_name(user) -> str | None:
    role = getattr(user, "role", None)
    return getattr(role, "name", None)


class OrderPolicy:
    def __init__(self, user):
        self.user = user
        self.role_name = _get_user_role_name(user)

    def allowed_groups(self) -> set[str]:
        return ORDER_ROLE_GROUPS.get(self.role_name, set())

    def editable_fields(self):
        groups = self.allowed_groups()
        if "ALL" in groups:
            return "ALL"
        fields: set[str] = set()
        for group in groups:
            fields |= ORDER_FIELD_GROUPS.get(group, set())
        # Remove special operation markers like __images__/__files__/__values__
        return {f for f in fields if not str(f).startswith("__")}

    def allows_special(self, special_marker: str) -> bool:
        groups = self.allowed_groups()
        if "ALL" in groups:
            return True
        for group in groups:
            if special_marker in ORDER_FIELD_GROUPS.get(group, set()):
                return True
        return False

    def filter_payload(self, payload: dict) -> dict:
        allowed = self.editable_fields()
        if allowed == "ALL":
            return payload
        return {k: v for k, v in payload.items() if k in allowed}


