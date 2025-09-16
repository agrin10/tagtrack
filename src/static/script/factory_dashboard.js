document.addEventListener('DOMContentLoaded', function() {
    // Helper function to convert Gregorian date to Jalali format

    const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    const orderDetailForm = document.getElementById('updateProductionStatusForm');
    const jobMetricsContainer = document.getElementById('modal-job-metrics-container');

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const orderId = this.dataset.orderId;
            if (orderId) {
                await loadOrderDetails(orderId);
                orderDetailModal.show();
                
                // Re-initialize JalaliDatePicker after modal is shown
                setTimeout(() => {
                    const dateInputs = document.querySelectorAll('input[data-jdp]');
                    dateInputs.forEach(input => {
                        if (input && !input.hasAttribute('data-jdp-initialized')) {
                            input.setAttribute('data-jdp-initialized', 'true');
                            // Trigger JalaliDatePicker initialization for this input
                            if (window.jalaliDatepicker && window.jalaliDatepicker.startWatch) {
                                window.jalaliDatepicker.startWatch();
                            }
                        }
                    });
                }, 200);
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
            
            // Ensure job metrics are properly populated after modal is shown
            setTimeout(() => {
                const jobMetricsContainer = document.getElementById('modal-job-metrics-container');
                if (jobMetricsContainer) {
                    // Force a re-render of job metrics if needed
                    const order = data.order;
                    if (order.job_metrics && order.job_metrics.length > 0) {
                        jobMetricsContainer.innerHTML = '';
                        order.job_metrics.forEach((metric, index) => {
                            addMetricRowToModal(metric);
                        });
                    }
                }
            }, 100);
            
        } catch (error) {
            console.error('Error loading order details:', error);
            showAlert('خطا در بارگذاری جزئیات سفارش', 'danger');
        }
    }

    function populateModal(order) {
        document.getElementById('modal-form-number').textContent = order.form_number;
        document.getElementById('modal-customer-details').textContent = `${order.customer_name} • ${order.quantity || 0} عدد`;
        
        // Set progress bar - if status is completed or shipped, set to 100%
        let progressPercentage = order.progress_percentage || 0;
        if (order.status === 'Completed' || order.status === 'تکمیل شده' || 
            order.status === 'Shipped' || order.status === 'ارسال شده') {
            progressPercentage = 100;
        }
        document.getElementById('modal-progress-bar').style.width = `${progressPercentage}%`;
        document.getElementById('modal-progress-bar').setAttribute('aria-valuenow', progressPercentage);
        
        document.getElementById('modal-started-date').textContent = formatDate(order.order_date);
        document.getElementById('modal-est-completion-date').textContent = formatDate(order.delivery_date);
        document.getElementById('modal-status-badge').textContent = order.status ? getStatusText(order.status) : 'جدید';
        document.getElementById('modal-status-badge').className = `badge bg-${getStatusBadgeClass(order.status || 'New')}`;

        // Production Status Form
        document.getElementById('modal-order-id').value = order.id;
        document.getElementById('modal-update-stage').value = order.current_stage || '';
        document.getElementById('modal-progress-percentage').value = progressPercentage;
        document.getElementById('modal-factory-notes').value = order.factory_notes || '';

        // Invoice Form - Set order ID for invoice generation
        document.querySelector('#factoryInvoiceForm input[name="order_id"]').value = order.id;

        // Populate invoice form with existing invoice data if available
        if (order.invoice_data && Object.keys(order.invoice_data).length > 0) {
            const invoice = order.invoice_data;
            const hasActualInvoice = order.has_actual_invoice || false;
            const hasDraft = order.has_draft || false;
            
            // Populate invoice form fields
            const creditCardInput = document.getElementById('modalCreditCard');
            const quantityInput = document.getElementById('modalQuantity');
            const cuttingCostInput = document.getElementById('modalCuttingCost');
            const numberOfCutsInput = document.getElementById('modalNumberOfCuts');
            const numberOfDensityInput = document.getElementById('modalNumberOfDensity');
            const peakQuantityInput = document.getElementById('modalPeakQuantity');
            const peakWidthInput = document.getElementById('modalPeakWidth');
            const feeInput = document.getElementById('modalFee');
            const rowNumberInput = document.getElementById('modalRowNumber');
            const notesInput = document.getElementById('modalNotes');

            if (creditCardInput) creditCardInput.value = invoice.credit_card || '';
            if (quantityInput) quantityInput.value = invoice.quantity || '';
            if (cuttingCostInput) cuttingCostInput.value = invoice.cutting_cost || '';
            if (numberOfCutsInput) numberOfCutsInput.value = invoice.number_of_cuts || '';
            if (numberOfDensityInput) numberOfDensityInput.value = invoice.number_of_density || '';
            if (peakQuantityInput) peakQuantityInput.value = invoice.peak_quantity || '';
            if (peakWidthInput) peakWidthInput.value = invoice.peak_width || '';
            if (feeInput) feeInput.value = invoice.Fee || '';
            if (rowNumberInput) rowNumberInput.value = invoice.row_number || '';
            if (notesInput) notesInput.value = invoice.notes || '';

            // Add appropriate alert based on invoice type
            const invoiceAlert = document.createElement('div');
            invoiceAlert.className = hasActualInvoice ? 'alert alert-success mb-3' : 'alert alert-info mb-3';
            
            if (hasActualInvoice) {
                invoiceAlert.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>فاکتور موجود:</strong> فاکتور ${invoice.invoice_number} قبلاً برای این سفارش ایجاد شده است. 
                    اطلاعات موجود در فرم قابل ویرایش است و با بروزرسانی وضعیت تولید، فاکتور نیز به‌روزرسانی خواهد شد.
                `;
            } else if (hasDraft) {
                invoiceAlert.innerHTML = `
                    <i class="fas fa-edit me-2"></i>
                    <strong>پیش‌نویس فاکتور:</strong> اطلاعات فاکتور به صورت پیش‌نویس ذخیره شده است. 
                    با تکمیل سفارش (وضعیت "تکمیل شده")، فاکتور نهایی ایجاد خواهد شد.
                `;
            }
            
            const invoiceForm = document.getElementById('factoryInvoiceForm');
            if (invoiceForm) {
                invoiceForm.insertBefore(invoiceAlert, invoiceForm.firstChild);
            }

            // Trigger price calculation to update the total
            setTimeout(() => {
                const priceInputs = ['modalQuantity', 'modalPeakQuantity', 'modalPeakWidth', 'modalFee', 'modalCuttingCost', 'modalNumberOfCuts'];
                priceInputs.forEach(inputId => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.dispatchEvent(new Event('input'));
                    }
                });
            }, 100);
        }

        // Job Metrics
        const jobMetricsContainer = document.getElementById('modal-job-metrics-container');
        
        // Clear existing dynamic content but preserve the container
        const existingRows = jobMetricsContainer.querySelectorAll('.row');
        existingRows.forEach(row => row.remove());
        
        if (order.job_metrics && order.job_metrics.length > 0) {
            order.job_metrics.forEach((metric, index) => {
                addMetricRowToModal(metric);
            });
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
                    if (dateInput) dateInput.value = convertToJalali(stepData.date) || '';
                    if (memberCountInput) memberCountInput.value = stepData.member_count || '';
                }
            });
        }

        // Re-initialize JalaliDatePicker for production step date inputs
        setTimeout(() => {
            const dateInputs = document.querySelectorAll('input[data-jdp]');
            dateInputs.forEach(input => {
                if (input && !input.hasAttribute('data-jdp-initialized')) {
                    input.setAttribute('data-jdp-initialized', 'true');
                    // Trigger JalaliDatePicker initialization for this input
                    if (window.jalaliDatepicker && window.jalaliDatepicker.startWatch) {
                        window.jalaliDatepicker.startWatch();
                    }
                }
            });
        }, 100);
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

            // Collect invoice data from the modal
            payload.invoice_data = collectInvoiceDataFromModal();

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
            
            // Show success message with invoice info if available
            let message = data.message || 'وضعیت تولید با موفقیت به‌روزرسانی شد';
            if (data.invoice_result && data.invoice_result.success) {
                if (data.is_completed) {
                    if (data.invoice_result.is_update) {
                        message += ` فاکتور ${data.invoice_result.invoice_number} با موفقیت به‌روزرسانی شد.`;
                    } else {
                        message += ` فاکتور ${data.invoice_result.invoice_number} با موفقیت ایجاد شد.`;
                    }
                } else {
                    if (data.invoice_result.is_update) {
                        message += ` پیش‌نویس فاکتور با موفقیت به‌روزرسانی شد.`;
                    } else {
                        message += ` پیش‌نویس فاکتور با موفقیت ایجاد شد.`;
                    }
                }
            }
            
            showAlert(message, 'success');
            // Optionally, refresh the page or update the card to reflect changes
            location.reload(); 
        } catch (error) {
            console.error('Error updating production status:', error);
            showAlert('خطا در به‌روزرسانی وضعیت تولید', 'danger');
        }
    }

    function collectJobMetricsFromModal() {
        const metrics = [];
        document.querySelectorAll('#modal-job-metrics-container .row').forEach(row => {
            const package_count = row.querySelector('input[name*="[package_count]"]')?.value || 0;
            const package_value = row.querySelector('input[name*="[package_value]"]')?.value || 0;
            const roll_count = row.querySelector('input[name*="[roll_count]"]')?.value || 0;
            const meterage = row.querySelector('input[name*="[meterage]"]')?.value || 0;
            
            // Only add if at least one field has a value
            if (package_count || package_value || roll_count || meterage) {
                metrics.push({
                    package_count: package_count,
                    package_value: package_value,
                    roll_count: roll_count,
                    meterage: meterage
                });
            }
        });
        return metrics;
    }

    function collectMachineDataFromModal() {
        const machineData = [];
        document.querySelectorAll('#production-table-body tr').forEach(row => {
            const worker_name = row.querySelector('input[name$="[worker_name]"]')?.value || null;
            const start_time = row.querySelector('input[name$="[start_time]"]')?.value || null;
            const end_time = row.querySelector('input[name$="[end_time]"]')?.value || null;
            const starting_quantity = row.querySelector('input[name$="[starting_quantity]"]')?.value || null;
            const remaining_quantity = row.querySelector('input[name$="[remaining_quantity]"]')?.value || null;
            const shift_type = row.querySelector('select[name$="[shift_type]"]')?.value || null;

            // Only add rows that have at least a worker name or a shift type selected
            if (worker_name || shift_type) {
                machineData.push({
                    worker_name: worker_name,
                    start_time: start_time,
                    end_time: end_time,
                    starting_quantity: starting_quantity,
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
            let date = dateInput ? dateInput.value : null;
            const member_count = memberCountInput ? (memberCountInput.value ? parseInt(memberCountInput.value) : null) : null;

            // Convert Jalali date to Gregorian if it's a Jalali date
            if (date && date.includes('/')) {
                date = convertToGregorian(date);
            }

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

    function collectInvoiceDataFromModal() {
        const invoiceForm = document.getElementById('factoryInvoiceForm');
        if (!invoiceForm) {
            return { should_save_invoice: false };
        }

        // Check if any invoice fields have been filled
        const invoiceFields = [
            'credit_card', 'quantity', 'cutting_cost', 'number_of_cuts', 
            'number_of_density', 'peak_quantity', 'peak_width', 'Fee', 'row_number', 'notes'
        ];

        let hasInvoiceData = false;
        const invoiceData = {};

        invoiceFields.forEach(fieldName => {
            const field = invoiceForm.querySelector(`[name="${fieldName}"]`);
            if (field && field.value && field.value.trim()) {
                invoiceData[fieldName] = field.value.trim();
                hasInvoiceData = true;
            }
        });

        // Check if required fields are filled
        const requiredFields = ['quantity', 'peak_quantity', 'peak_width', 'Fee'];
        const hasRequiredFields = requiredFields.every(fieldName => 
            invoiceData[fieldName] && invoiceData[fieldName] !== ''
        );

        // Check if there's an existing invoice alert (indicating an invoice already exists)
        const existingInvoiceAlert = invoiceForm.querySelector('.alert-warning');
        const hasExistingInvoice = existingInvoiceAlert !== null;

        return {
            should_save_invoice: hasInvoiceData && hasRequiredFields,
            has_existing_invoice: hasExistingInvoice,
            ...invoiceData
        };
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
        'در حال تولید': 'warning',
        'طراحی': 'info',
        'چاپ': 'primary',
        'برش': 'primary',
        'کنترل کیفیت': 'info',
        'بسته‌بندی': 'info',
        'ارسال شده': 'success',
        'جدید': 'secondary',
        'سفارش': 'secondary'
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
        'In Progress': 'در حال تولید',
        'Design': 'طراحی',
        'Printing': 'چاپ',
        'Cutting': 'برش',
        'Finishing': 'تمام شده',
        'Quality Control': 'کنترل کیفیت',
        'Packaging': 'بسته‌بندی',
        'Shipped': 'ارسال شده',
        'Pending': 'سفارش',
        
        // Persian to Persian (if already in Persian)
        'جدید': 'جدید',
        'تکمیل شده': 'تکمیل شده',
        'پایان یافته': 'پایان یافته',
        'لغو شده': 'لغو شده',
        'در حال نولید': 'در حال تولید',
        'طراحی': 'طراحی',
        'چاپ': 'چاپ',
        'برش': 'برش',
        'تمام شده': 'تمام شده',
        'کنترل کیفیت': 'کنترل کیفیت',
        'بسته‌بندی': 'بسته‌بندی',
        'ارسال شده': 'ارسال شده',
        'سفارش': 'سفارش'
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

    // Add tab click handler for job metrics
    document.addEventListener('DOMContentLoaded', function() {
        const jobMetricsTab = document.getElementById('job-metrics-tab');
        if (jobMetricsTab) {
            jobMetricsTab.addEventListener('click', function() {
                // Ensure job metrics are properly populated when tab is shown
                setTimeout(() => {
                    const jobMetricsContainer = document.getElementById('modal-job-metrics-container');
                    if (jobMetricsContainer && jobMetricsContainer.children.length === 0) {
                        addMetricRowToModal();
                    }
                }, 50);
            });
        }

        // Add tab click handler for production steps to re-initialize datepicker
        const productionStepsTab = document.getElementById('production-steps-tab');
        if (productionStepsTab) {
            productionStepsTab.addEventListener('click', function() {
                // Re-initialize JalaliDatePicker for production step date inputs
                setTimeout(() => {
                    const dateInputs = document.querySelectorAll('input[data-jdp]');
                    dateInputs.forEach(input => {
                        if (input && !input.hasAttribute('data-jdp-initialized')) {
                            input.setAttribute('data-jdp-initialized', 'true');
                            // Trigger JalaliDatePicker initialization for this input
                            if (window.jalaliDatepicker && window.jalaliDatepicker.startWatch) {
                                window.jalaliDatepicker.startWatch();
                            }
                        }
                    });
                }, 100);
            });
        }
    });

    // Update progress bars for completed/shipped orders on page load
    document.querySelectorAll('.progress-bar').forEach(bar => {
        const progress = bar.dataset.progress;
        if (progress) {
            bar.style.width = `${progress}%`;
        }
    });

    // Credit card formatting for invoice form
    document.addEventListener('DOMContentLoaded', function() {
        const creditCardInput = document.getElementById('modalCreditCard');
        if (creditCardInput) {
            creditCardInput.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, ''); // remove non-digits
                value = value.substring(0, 16); // limit to 16 digits

                // Format like XXXX.XXXX.XXXX.XXXX
                const formatted = value.match(/.{1,4}/g)?.join('.') || '';
                e.target.value = formatted;
            });
        }

        // Real-time total price calculation
        function calculateTotalPrice() {
            const quantity = parseFloat(document.getElementById('modalQuantity')?.value) || 0;
            const peakQuantity = parseFloat(document.getElementById('modalPeakQuantity')?.value) || 0;
            const peakWidth = parseFloat(document.getElementById('modalPeakWidth')?.value) || 0;
            const fee = parseFloat(document.getElementById('modalFee')?.value) || 0;
            const cuttingCost = parseFloat(document.getElementById('modalCuttingCost')?.value) || 0;
            const numberOfCuts = parseInt(document.getElementById('modalNumberOfCuts')?.value) || 0;

            const unitPrice = peakQuantity * peakWidth * fee;
            const totalPrice = (unitPrice * quantity) + cuttingCost + numberOfCuts;

            // Display total price if element exists
            const totalPriceElement = document.getElementById('calculated-total-price');
            if (totalPriceElement) {
                totalPriceElement.textContent = totalPrice.toLocaleString('fa-IR') + ' تومان';
            }
        }

        // Add event listeners for price calculation
        const priceInputs = ['modalQuantity', 'modalPeakQuantity', 'modalPeakWidth', 'modalFee', 'modalCuttingCost', 'modalNumberOfCuts'];
        priceInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', calculateTotalPrice);
            }
        });

        // Remove the separate invoice form submission handler since it's now integrated into production status update
    });
// --- Calculate total production duration ---
function calculateProductionDuration() {
    let totalMinutes = 0;

    document.querySelectorAll('#production-table-body tr').forEach(row => {
        const startTime = row.querySelector('input[name$="[start_time]"]')?.value;
        const endTime = row.querySelector('input[name$="[end_time]"]')?.value;

        if (startTime && endTime) {
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);

            let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

            // If end time is after midnight (e.g., 23:00 to 02:00)
            if (durationMinutes < 0) {
                durationMinutes += 24 * 60;
            }

            totalMinutes += durationMinutes;
        }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    document.getElementById('production-duration-input').value =
        `${hours} ساعت و ${minutes} دقیقه`;
}
// --- Add a new row ---
function addProductionRow() {
    const tableBody = document.getElementById('production-table-body');
    const newRow = tableBody.insertRow();
    const rowIndex = tableBody.rows.length - 1;

    newRow.innerHTML = `
        <td class="py-2 px-3">
            <select class="form-select" name="machine_data[${rowIndex}][shift_type]">
                <option value="day">روز</option>
                <option value="night">شب</option>
            </select>
        </td>
        <td class="py-2 px-3">
            <input type="text" class="form-control" name="machine_data[${rowIndex}][worker_name]" placeholder="نام کارگر">
        </td>
        <td class="py-2 px-3">
            <input type="time" class="form-control" name="machine_data[${rowIndex}][start_time]">
        </td>
        <td class="py-2 px-3">
            <input type="time" class="form-control" name="machine_data[${rowIndex}][end_time]">
        </td>
        <td class="py-2 px-3">
            <input type="number" class="form-control" name="machine_data[${rowIndex}][starting_quantity]" placeholder="تعداد شروع">
        </td>
        <td class="py-2 px-3">
            <input type="number" class="form-control" name="machine_data[${rowIndex}][remaining_quantity]" placeholder="تعداد مانده">
        </td>
        <td class="py-2 px-3">
            <button type="button" class="btn btn-danger btn-sm">حذف</button>
        </td>
    `;

    const startInput = newRow.querySelector(`input[name$="[start_time]"]`);
    const endInput = newRow.querySelector(`input[name$="[end_time]"]`);

    startInput.addEventListener('input', calculateProductionDuration);
    endInput.addEventListener('input', calculateProductionDuration);

    newRow.querySelector('button').addEventListener('click', () => {
        newRow.remove();
        calculateProductionDuration();
    });

    calculateProductionDuration();
}

// --- Populate table with existing data ---
function populateMachineData(order) {
    const tableBody = document.getElementById('production-table-body');
    tableBody.innerHTML = ''; // clear current rows

    const machineData = order.machine_data || [];

    if (machineData.length > 0) {
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
                <td class="py-2 px-3">
                    <input type="text" class="form-control" name="machine_data[${index}][worker_name]" placeholder="نام کارگر" value="${data.worker_name || ''}">
                </td>
                <td class="py-2 px-3">
                    <input type="time" class="form-control" name="machine_data[${index}][start_time]" value="${data.start_time ? data.start_time.substring(11, 16) : ''}">
                </td>
                <td class="py-2 px-3">
                    <input type="time" class="form-control" name="machine_data[${index}][end_time]" value="${data.end_time ? data.end_time.substring(11, 16) : ''}">
                </td>
                <td class="py-2 px-3">
                    <input type="number" class="form-control" name="machine_data[${index}][starting_quantity]" placeholder="تعداد شروع" value="${data.starting_quantity || ''}">
                </td>
                <td class="py-2 px-3">
                    <input type="number" class="form-control" name="machine_data[${index}][remaining_quantity]" placeholder="تعداد مانده" value="${data.remaining_quantity || ''}">
                </td>
                <td class="py-2 px-3">
                    <button type="button" class="btn btn-danger btn-sm">حذف</button>
                </td>
            `;

            const startInput = newRow.querySelector(`input[name$="[start_time]"]`);
            const endInput = newRow.querySelector(`input[name$="[end_time]"]`);

            startInput.addEventListener('input', calculateProductionDuration);
            endInput.addEventListener('input', calculateProductionDuration);

            newRow.querySelector('button').addEventListener('click', () => {
                newRow.remove();
                calculateProductionDuration();
            });
        });
    } else {
        addProductionRow();
    }

    // Optional: set saved duration if exists
    document.getElementById('production-duration-input').value = order.production_duration || '';

    calculateProductionDuration();
}


    // Modify addMetricRowToModal to include a delete button for job metrics
    function addMetricRowToModal(metric = null) {
        const container = document.getElementById('modal-job-metrics-container');
        const existingRows = container.querySelectorAll('.row');
        const index = existingRows.length;
        
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
    setupTableSearch('#searchInput', '#ordersTable tbody tr');

});