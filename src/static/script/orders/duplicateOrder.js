import { showAlert } from './alerts.js';

export function initDuplicateOrder() {
    document.querySelectorAll('.duplicate-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const duplicateBtn = this;
            duplicateBtn.disabled = true;
            const originalIcon = duplicateBtn.innerHTML;
            duplicateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            fetch(`/orders/${orderId}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { throw new Error(data.error || 'Failed to duplicate order'); });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showAlert('success', data.message || 'سفارش با موفقیت کپی شد!', document.querySelector('.container-fluid'));
                    setTimeout(() => { window.location.reload(); }, 1000);
                } else {
                    throw new Error(data.error || 'Failed to duplicate order');
                }
            })
            .catch(error => {
                showAlert('danger', error.message || 'Error duplicating order', document.querySelector('.container-fluid'));
            })
            .finally(() => {
                duplicateBtn.disabled = false;
                duplicateBtn.innerHTML = originalIcon;
            });
        });
    });
} 