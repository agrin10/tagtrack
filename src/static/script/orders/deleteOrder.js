import { showAlert } from './alerts.js';

export function initDeleteOrder() {
    let orderToDelete = null;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteOrderModal'));
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    document.querySelectorAll('.delete-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            orderToDelete = this.getAttribute('data-order-id');
        });
    });
    confirmDeleteBtn.addEventListener('click', function() {
        if (!orderToDelete) return;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
        fetch(`/orders/${orderToDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw new Error(data.error || 'Failed to delete order'); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showAlert('success', data.message || 'سفارش با موفقیت پاک شد !', document.querySelector('.container-fluid'));
                const row = document.querySelector(`[data-order-id="${orderToDelete}"]`).closest('tr');
                if (row) row.remove();
                deleteModal.hide();
            } else {
                throw new Error(data.error || 'Failed to delete order');
            }
        })
        .catch(error => {
            showAlert('danger', error.message || 'An error occurred while deleting the order.', document.querySelector('.container-fluid'));
        })
        .finally(() => {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Delete Order';
            orderToDelete = null;
        });
    });
    document.getElementById('deleteOrderModal').addEventListener('hidden.bs.modal', function () {
        orderToDelete = null;
    });
} 