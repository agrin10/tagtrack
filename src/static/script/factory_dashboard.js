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
    window.addMetricRowToModal = function(metric = null) {
        const container = document.getElementById('modal-job-metrics-container');
        const index = container.children.length;
        const newMetricRow = document.createElement('div');
        newMetricRow.className = 'row g-2 mb-2 align-items-end';
        newMetricRow.innerHTML = `
            <div class="col-md-3">
                <label class="form-label small text-muted">تعداد بسته</label>
                <input type="number" class="form-control form-control-sm" name="job_metrics[${index}][package_count]" value="${metric ? metric.package_count : ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label small text-muted">ارزش بسته</label>
                <input type="number" step="0.01" class="form-control form-control-sm" name="job_metrics[${index}][package_value]" value="${metric ? metric.package_value : ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label small text-muted">تعداد رول</label>
                <input type="number" class="form-control form-control-sm" name="job_metrics[${index}][roll_count]" value="${metric ? metric.roll_count : ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label small text-muted">متراژ</label>
                <input type="number" step="0.01" class="form-control form-control-sm" name="job_metrics[${index}][meterage]" value="${metric ? metric.meterage : ''}">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.row').remove()"><i class="fas fa-times"></i></button>
            </div>
        `;
        container.appendChild(newMetricRow);
    };

    async function loadOrderDetails(orderId) {
        try {
            const response = await fetch(`/factory/orders/${orderId}/details`);
            if (!response.ok) {
                throw new Error('Failed to load order details');
            }
            const data = await response.json();
            populateModal(data.order);
        } catch (error) {
            console.error('Error loading order details:', error);
            showAlert('خطا در بارگذاری جزئیات سفارش', 'danger');
        }
    }

    function populateModal(order) {
        document.getElementById('modal-form-number').textContent = order.form_number;
        document.getElementById('modal-customer-details').textContent = `${order.customer_name} • ${order.quantity || 0} عدد`;
        document.getElementById('modal-progress-bar').style.width = `${order.progress_percentage || 0}%`;
        document.getElementById('modal-progress-bar').setAttribute('aria-valuenow', order.progress_percentage || 0);
        document.getElementById('modal-started-date').textContent = formatDate(order.order_date);
        document.getElementById('modal-est-completion-date').textContent = formatDate(order.delivery_date);
        document.getElementById('modal-status-badge').textContent = order.status ? getStatusText(order.status) : 'جدید';
        document.getElementById('modal-status-badge').className = `badge bg-${getStatusBadgeClass(order.status || 'New')}`;

        // Production Status Form
        document.getElementById('modal-order-id').value = order.id;
        document.getElementById('modal-update-stage').value = order.current_stage || '';
        document.getElementById('modal-progress-percentage').value = order.progress_percentage || 0;
        document.getElementById('modal-factory-notes').value = order.factory_notes || '';

        // Job Metrics
        jobMetricsContainer.innerHTML = '';
        if (order.job_metrics && order.job_metrics.length > 0) {
            order.job_metrics.forEach(metric => addMetricRowToModal(metric));
        } else {
            addMetricRowToModal(); // Add an empty row if no metrics exist
        }

        // Machine Data
        populateMachineData(order);

        // Production Steps
        const productionStepsContainer = document.getElementById('production-steps-container');
        // Clear existing values in production step fields
        const stepKeys = ['mongane', 'ahar', 'press', 'bresh'];
        stepKeys.forEach(stepKey => {
            const workerNameInput = document.querySelector(`input[name="production_steps[${stepKey}][worker_name]"]`);
            const dateInput = document.querySelector(`input[name="production_steps[${stepKey}][date]"]`);
            const memberCountInput = document.querySelector(`input[name="production_steps[${stepKey}][member_count]"]`);

            if (workerNameInput) workerNameInput.value = '';
            if (dateInput) dateInput.value = '';
            if (memberCountInput) memberCountInput.value = '';
        });

        if (order.production_steps) {
            Object.keys(order.production_steps).forEach(stepKey => {
                const stepData = order.production_steps[stepKey];
                if (stepData) {
                    const workerNameInput = document.querySelector(`input[name="production_steps[${stepKey}][worker_name]"]`);
                    const dateInput = document.querySelector(`input[name="production_steps[${stepKey}][date]"]`);
                    const memberCountInput = document.querySelector(`input[name="production_steps[${stepKey}][member_count]"]`);

                    if (workerNameInput) workerNameInput.value = stepData.worker_name || '';
                    if (dateInput) dateInput.value = stepData.date || '';
                    if (memberCountInput) memberCountInput.value = stepData.member_count || '';
                }
            });
        }
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

            // Collect production steps data from the modal
            payload.production_steps = collectProductionStepsFromModal();

            const response = await fetch(`/factory/orders/${orderId}/update-production-status`, {
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
            showAlert(data.message || 'وضعیت تولید با موفقیت به‌روزرسانی شد', 'success');
            // Optionally, refresh the page or update the card to reflect changes
            location.reload(); 
        } catch (error) {
            console.error('Error updating production status:', error);
            showAlert('خطا در به‌روزرسانی وضعیت تولید', 'danger');
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

    function collectProductionStepsFromModal() {
        const productionSteps = {};
        const steps = ['mongane', 'ahar', 'press', 'bresh'];

        steps.forEach(stepKey => {
            const workerNameInput = document.querySelector(`input[name="production_steps[${stepKey}][worker_name]"]`);
            const dateInput = document.querySelector(`input[name="production_steps[${stepKey}][date]"]`);
            const memberCountInput = document.querySelector(`input[name="production_steps[${stepKey}][member_count]"]`);

            const worker_name = workerNameInput ? workerNameInput.value : null;
            const date = dateInput ? dateInput.value : null;
            const member_count = memberCountInput ? (memberCountInput.value ? parseInt(memberCountInput.value) : null) : null;

            // Only add the step if at least one field is filled
            if (worker_name || date || member_count) {
                productionSteps[stepKey] = {
                    worker_name: worker_name,
                    date: date,
                    member_count: member_count
                };
            }
        });
        return productionSteps;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        // Persian date formatting (fallback to en if not supported)
        return date.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

function getStatusBadgeClass(status) {
    if (!status) return 'secondary';
    
    const statusClassMap = {
        // English statuses
        'Completed': 'success',
        'Finished': 'success',
        'Cancelled': 'danger',
        'In Progress': 'warning',
        'Design': 'info',
        'Printing': 'primary',
        'Cutting': 'primary',
        'Finishing': 'primary',
        'Quality Control': 'info',
        'Packaging': 'info',
        'Shipped': 'success',
        'New': 'secondary',
        'Pending': 'secondary',

        
        // Persian statuses
        'تکمیل شده': 'success',
        'پایان یافته': 'success',
        'لغو شده': 'danger',
        'در حال انجام': 'warning',
        'طراحی': 'info',
        'چاپ': 'primary',
        'برش': 'primary',
        'کنترل کیفیت': 'info',
        'بسته‌بندی': 'info',
        'ارسال شده': 'success',
        'جدید': 'secondary',
        'در انتظار': 'secondary'
    };
    
    return statusClassMap[status] || 'secondary';
}
function getStatusText(status) {
    if (!status) return 'جدید';
    
    const statusMap = {
        // English to Persian mapping
        'New': 'جدید',
        'Completed': 'تکمیل شده',
        'Finished': 'پایان یافته',
        'Cancelled': 'لغو شده',
        'In Progress': 'در حال انجام',
        'Design': 'طراحی',
        'Printing': 'چاپ',
        'Cutting': 'برش',
        'Finishing': 'تکمیل',
        'Quality Control': 'کنترل کیفیت',
        'Packaging': 'بسته‌بندی',
        'Shipped': 'ارسال شده',
        'Pending': 'در انتظار',
        
        // Persian to Persian (if already in Persian)
        'جدید': 'جدید',
        'تکمیل شده': 'تکمیل شده',
        'پایان یافته': 'پایان یافته',
        'لغو شده': 'لغو شده',
        'در حال انجام': 'در حال انجام',
        'طراحی': 'طراحی',
        'چاپ': 'چاپ',
        'برش': 'برش',
        'تمام شده': 'تمام شده',
        'کنترل کیفیت': 'کنترل کیفیت',
        'بسته‌بندی': 'بسته‌بندی',
        'ارسال شده': 'ارسال شده',
        ' در انتظار': ' در انتظار'
    };
    
    return statusMap[status] || status;
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
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="بستن"></button>
            </div>
        `;
        alertPlaceholder.append(wrapper);

        setTimeout(() => {
            bootstrap.Alert.getInstance(wrapper.querySelector('.alert'))?.close();
        }, 5000);
    }

    // Make these functions globally accessible if they are called from inline HTML
    window.addProductionRow = addProductionRow;
    window.populateMachineData = populateMachineData;
    window.addMetricRowToModal = addMetricRowToModal;
    window.formatDateForInput = formatDateForInput;
    window.formatTimeForInput = formatTimeForInput;

    function addProductionRow() {
        const tableBody = document.getElementById('production-table-body');
        const newRow = tableBody.insertRow();
        const rowIndex = tableBody.rows.length;
        newRow.setAttribute('data-row-index', rowIndex);

        newRow.innerHTML = `
            <td class="py-2 px-3">
                <select class="form-select form-select-sm" name="machine_data[${rowIndex}][shift_type]">
                    <option value="day">روز</option>
                    <option value="night">شب</option>
                </select>
            </td>
            <td class="py-2 px-3"><input type="text" class="form-control form-control-sm" name="machine_data[${rowIndex}][worker_name]" placeholder="نام کارگر"></td>
            <td class="py-2 px-3"><input type="time" class="form-control form-control-sm" name="machine_data[${rowIndex}][start_time]" placeholder="ساعت شروع"></td>
            <td class="py-2 px-3"><input type="time" class="form-control form-control-sm" name="machine_data[${rowIndex}][end_time]" placeholder="ساعت اتمام"></td>
            <td class="py-2 px-3"><input type="number" class="form-control form-control-sm" name="machine_data[${rowIndex}][remaining_quantity]" placeholder="تعداد مانده"></td>
            <td class="py-2 px-3"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();">حذف</button></td>
        `;
    }

    // Function to populate machine data when modal is opened
    function populateMachineData(order) {
        const tableBody = document.getElementById('production-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        const machineData = order.machine_data || [];

        if (machineData && machineData.length > 0) {
            // Sort by shift type if needed, e.g., day first then night
            machineData.sort((a, b) => a.shift_type.localeCompare(b.shift_type));

            machineData.forEach((data, index) => {
                const newRow = tableBody.insertRow();
                newRow.setAttribute('data-row-index', index);
                newRow.innerHTML = `
                    <td class="py-2 px-3">
                        <select class="form-select form-select-sm" name="machine_data[${index}][shift_type]">
                            <option value="day" ${data.shift_type === 'day' ? 'selected' : ''}>روز</option>
                            <option value="night" ${data.shift_type === 'night' ? 'selected' : ''}>شب</option>
                        </select>
                    </td>
                    <td class="py-2 px-3"><input type="text" class="form-control form-control-sm" name="machine_data[${index}][worker_name]" placeholder="نام کارگر" value="${data.worker_name || ''}"></td>
                    <td class="py-2 px-3"><input type="time" class="form-control form-control-sm" name="machine_data[${index}][start_time]" placeholder="ساعت شروع" value="${data.start_time ? data.start_time.substring(11, 16) : ''}"></td>
                    <td class="py-2 px-3"><input type="time" class="form-control form-control-sm" name="machine_data[${index}][end_time]" placeholder="ساعت اتمام" value="${data.end_time ? data.end_time.substring(11, 16) : ''}"></td>
                    <td class="py-2 px-3"><input type="number" class="form-control form-control-sm" name="machine_data[${index}][remaining_quantity]" placeholder="تعداد مانده" value="${data.remaining_quantity || ''}"></td>
                    <td class="py-2 px-3"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();">حذف</button></td>
                `;
            });
        } else {
            // Add an empty row if no data exists, for the first shift
            addProductionRow();
        }

        // Populate production duration
        document.getElementById('production-duration-input').value = order.production_duration || '';
    }
    setupTableSearch('#searchInput', '#ordersTable tbody tr');
        function addProductionRow() {
        const tableBody = document.getElementById('production-table-body');
        const newRow = tableBody.insertRow();
        const rowIndex = tableBody.rows.length;
        newRow.setAttribute('data-row-index', rowIndex);

        newRow.innerHTML = `
            <td class="py-2 px-3">
                <select class="form-select" name="machine_data[${rowIndex}][shift_type]">
                    <option value="day">روز</option>
                    <option value="night">شب</option>
                </select>
            </td>
            <td class="py-2 px-3"><input type="text" class="form-control" name="machine_data[${rowIndex}][worker_name]" placeholder="نام کارگر"></td>
            <td class="py-2 px-3"><input type="time" class="form-control" name="machine_data[${rowIndex}][start_time]" placeholder="ساعت شروع"></td>
            <td class="py-2 px-3"><input type="time" class="form-control" name="machine_data[${rowIndex}][end_time]" placeholder="ساعت اتمام"></td>
            <td class="py-2 px-3"><input type="number" class="form-control" name="machine_data[${rowIndex}][remaining_quantity]" placeholder="تعداد مانده"></td>
            <td class="py-2 px-3"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();">X</button></td>
        `;
    }

    // Function to populate machine data when modal is opened
    function populateMachineData(order) {
        const tableBody = document.getElementById('production-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        const machineData = order.machine_data || [];

        if (machineData && machineData.length > 0) {
            // Sort by shift type if needed, e.g., day first then night
            machineData.sort((a, b) => a.shift_type.localeCompare(b.shift_type));

            machineData.forEach((data, index) => {
                const newRow = tableBody.insertRow();
                newRow.setAttribute('data-row-index', index);
                newRow.innerHTML = `
                    <td class="py-2 px-3">
                        <select class="form-select" name="machine_data[${index}][shift_type]">
                            <option value="day" ${data.shift_type === 'day' ? 'selected' : ''}>روز</option>
                            <option value="night" ${data.shift_type === 'night' ? 'selected' : ''}>شب</option>
                        </select>
                    </td>
                    <td class="py-2 px-3"><input type="text" class="form-control" name="machine_data[${index}][worker_name]" placeholder="نام کارگر" value="${data.worker_name || ''}"></td>
                    <td class="py-2 px-3"><input type="time" class="form-control" name="machine_data[${index}][start_time]" placeholder="ساعت شروع" value="${data.start_time ? data.start_time.substring(11, 16) : ''}"></td>
                    <td class="py-2 px-3"><input type="time" class="form-control" name="machine_data[${index}][end_time]" placeholder="ساعت اتمام" value="${data.end_time ? data.end_time.substring(11, 16) : ''}"></td>
                    <td class="py-2 px-3"><input type="number" class="form-control" name="machine_data[${index}][remaining_quantity]" placeholder="تعداد مانده" value="${data.remaining_quantity || ''}"></td>
                    <td class="py-2 px-3"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();">X</button></td>
                `;
            });
        } else {
            // Add an empty row if no data exists, for the first shift
            addProductionRow();
        }

        // Populate production duration
        document.getElementById('production-duration-input').value = order.production_duration || '';
    }

    // Modify addMetricRowToModal to include a delete button for job metrics
    function addMetricRowToModal(metric = null) {
        const container = document.getElementById('modal-job-metrics-container');
        const index = container.children.length;
        const newMetricRow = document.createElement('div');
        newMetricRow.className = 'row g-2 mb-2 align-items-end';
        newMetricRow.innerHTML = `
            <div class="col-md-3">
                <label class="form-label">Package Count</label>
                <input type="number" class="form-control" name="job_metrics[${index}][package_count]" value="${metric ? metric.package_count : ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label">Package Value</label>
                <input type="number" step="0.01" class="form-control" name="job_metrics[${index}][package_value]" value="${metric ? metric.package_value : ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label">Roll Count</label>
                <input type="number" class="form-control" name="job_metrics[${index}][roll_count]" value="${metric ? metric.roll_count : ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Meterage</label>
                <input type="number" step="0.01" class="form-control" name="job_metrics[${index}][meterage]" value="${metric ? metric.meterage : ''}">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger" onclick="this.closest('.row').remove()">X</button>
            </div>
        `;
        container.appendChild(newMetricRow);
    }

    // Helper function to format date for input fields (if needed)
    function formatDateForInput(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Helper function to format time for input fields
    function formatTimeForInput(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    }

    // Make these functions globally accessible if they are called from inline HTML
    window.addProductionRow = addProductionRow;
    window.populateMachineData = populateMachineData;
    window.addMetricRowToModal = addMetricRowToModal;
    window.formatDateForInput = formatDateForInput;
    window.formatTimeForInput = formatTimeForInput;

});