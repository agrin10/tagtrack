document.addEventListener('DOMContentLoaded', function() {
    const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    const orderDetailForm = document.getElementById('updateProductionStatusForm');
    const jobMetricsContainer = document.getElementById('modal-job-metrics-container');

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const orderId = this.dataset.orderId;
            if (orderId) {
                await loadOrderDetails(orderId);
                orderDetailModal.show();
            }
        });
    });

    orderDetailForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const orderId = document.getElementById('modal-order-id').value;
        const formData = new FormData(this);
        const jsonData = Object.fromEntries(formData.entries());
        
        await updateProductionStatus(orderId, jsonData);
    });

    // Handle dynamic addition of job metric rows in modal
    window.addMetricRowToModal = function(metric = {}) {
        const row = document.createElement('div');
        row.className = 'row g-2 mb-3 job-metric-modal-row';
        row.innerHTML = `
            <div class="col-md-3">
                <label class="form-label">تعداد بسته</label>
                <input type="number" name="package_count[]" class="form-control" value="${metric.package_count || ''}" required>
            </div>
            <div class="col-md-3">
                <label class="form-label">مقدار بسته (متر)</label>
                <input type="number" step="0.01" name="package_value[]" class="form-control" value="${metric.package_value || ''}" required>
            </div>
            <div class="col-md-3">
                <label class="form-label">تعداد رول</label>
                <input type="number" name="roll_count[]" class="form-control" value="${metric.roll_count || ''}" required>
            </div>
            <div class="col-md-3 d-flex align-items-end">
                <div>
                    <label class="form-label">متراژ</label>
                    <input type="number" step="0.01" name="meterage[]" class="form-control" value="${metric.meterage || ''}" required>
                </div>
                <button type="button" class="btn btn-danger btn-sm ms-2" onclick="this.closest('.job-metric-modal-row').remove()">×</button>
            </div>
        `;
        jobMetricsContainer.appendChild(row);
    };

    async function loadOrderDetails(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}/details`);
            if (!response.ok) {
                throw new Error('Failed to load order details');
            }
            const data = await response.json();
            populateModal(data.order);
        } catch (error) {
            console.error('Error loading order details:', error);
            showAlert('Error loading order details', 'danger');
        }
    }

    function populateModal(order) {
        document.getElementById('modal-form-number').textContent = order.form_number;
        document.getElementById('modal-customer-details').textContent = `${order.customer_name} • ${order.quantity || 0} units`;
        document.getElementById('modal-progress-bar').style.width = `${order.progress_percentage || 0}%`;
        document.getElementById('modal-progress-bar').setAttribute('aria-valuenow', order.progress_percentage || 0);
        document.getElementById('modal-started-date').textContent = formatDate(order.order_date);
        document.getElementById('modal-est-completion-date').textContent = formatDate(order.delivery_date);
        document.getElementById('modal-status-badge').textContent = order.status || 'New';
        document.getElementById('modal-status-badge').className = `badge bg-${getStatusBadgeClass(order.status || 'New')}`;

        // Production Status Form
        document.getElementById('modal-order-id').value = order.id;
        document.getElementById('modal-update-stage').value = order.current_stage || '';
        document.getElementById('modal-progress-percentage').value = order.progress_percentage || 0;
        document.getElementById('modal-factory-notes').value = order.factory_notes || '';

        // Job Metrics
        jobMetricsContainer.innerHTML = ''; // Clear previous metrics
        if (order.job_metrics && order.job_metrics.length > 0) {
            order.job_metrics.forEach(metric => addMetricRowToModal(metric));
        } else {
            addMetricRowToModal(); // Add an empty row if no metrics exist
        }

        // Machine Data
        populateMachineData(order);
    }

    async function updateProductionStatus(orderId, formData) {
        try {
            // Create a plain object to hold all data
            const payload = {};

            // Add basic form fields (like current_stage, progress_percentage, factory_notes)
            new FormData(orderDetailForm).forEach((value, key) => {
                if (key !== 'job_metrics' && key !== 'machine_data' && key !== 'production_duration') { // Exclude array fields handled separately
                    payload[key] = value;
                }
            });

            // Collect job metrics from the modal
            payload.job_metrics = collectJobMetricsFromModal();

            // Collect machine data from the modal
            payload.machine_data = collectMachineDataFromModal();
            
            // Collect production duration
            payload.production_duration = document.getElementById('production-duration-input').value;

            const response = await fetch(`/api/orders/${orderId}/update-production-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to update production status');
            }

            const data = await response.json();
            showAlert(data.message || 'Production status updated successfully', 'success');
            // Optionally, refresh the page or update the card to reflect changes
            location.reload(); 
        } catch (error) {
            console.error('Error updating production status:', error);
            showAlert('Error updating production status', 'danger');
        }
    }

    function collectJobMetricsFromModal() {
        const metrics = [];
        document.querySelectorAll('.job-metric-modal-row').forEach(row => {
            const package_count = row.querySelector('input[name="package_count[]"]')?.value || 0;
            const package_value = row.querySelector('input[name="package_value[]"]')?.value || 0;
            const roll_count = row.querySelector('input[name="roll_count[]"]')?.value || 0;
            const meterage = row.querySelector('input[name="meterage[]"]')?.value || 0;
            metrics.push({
                package_count: package_count,
                package_value: package_value,
                roll_count: roll_count,
                meterage: meterage
            });
        });
        return metrics;
    }

    function collectMachineDataFromModal() {
        const machineData = [];
        document.querySelectorAll('#production-table-body tr').forEach(row => {
            const worker_name = row.querySelector('input[name$="[worker_name]"]')?.value || null;
            const start_time = row.querySelector('input[name$="[start_time]"]')?.value || null;
            const end_time = row.querySelector('input[name$="[end_time]"]')?.value || null;
            const remaining_quantity = row.querySelector('input[name$="[remaining_quantity]"]')?.value || null;
            const shift_type = row.querySelector('select[name$="[shift_type]"]')?.value || null;

            // Only add rows that have at least a worker name or a shift type selected
            if (worker_name || shift_type) {
                machineData.push({
                    worker_name: worker_name,
                    start_time: start_time,
                    end_time: end_time,
                    remaining_quantity: remaining_quantity,
                    shift_type: shift_type
                });
            }
        });
        return machineData;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'warning';
            case 'Cancelled': return 'danger';
            case 'Design':
            case 'Printing':
            case 'Cutting':
            case 'Finishing':
            case 'Quality Control':
            case 'Packaging':
            case 'Shipped':
            default: return 'secondary';
        }
    }

    function showAlert(message, type = 'info') {
        const alertPlaceholder = document.getElementById('alertPlaceholder');
        if (!alertPlaceholder) {
            console.warn('Alert placeholder not found.');
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertPlaceholder.append(wrapper);

        setTimeout(() => {
            bootstrap.Alert.getInstance(wrapper.querySelector('.alert'))?.close();
        }, 5000);
    }
}); 