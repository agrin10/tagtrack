document.addEventListener('DOMContentLoaded', function() {
    // --- Fetch and apply factory permissions ---
    let factoryPerms = {
        can_edit_job_metrics: false,
        can_edit_machine_data: false,
        can_edit_production_steps: false,
        can_edit_invoice: false,
        can_edit_status: false
    };
    let factoryPermsLoaded = false;

    function markReadonly(el) {
        if (!el) return;
        const tag = el.tagName?.toLowerCase();
        if (tag === 'select' || tag === 'input' || tag === 'textarea' || el.hasAttribute('contenteditable')) {
            el.disabled = true;
        }
        el.classList?.add('bg-light');
        el.setAttribute?.('title', 'شما اجازه ویرایش این بخش را ندارید');
    }

    function hideElement(el) {
        if (!el) return;
        el.style.display = 'none';
    }

    async function fetchFactoryPermissions() {
        try {
            const res = await fetch('/factory/permissions', { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return;
            const data = await res.json();
            factoryPerms = Object.assign(factoryPerms, data || {});
            factoryPermsLoaded = true;
            applyPermissionsToFactoryUI(factoryPerms);
        } catch (e) {
            console.warn('Failed to fetch factory permissions', e);
            factoryPermsLoaded = true; // avoid blocking submit if fetch failed
        }
    }

    function applyPermissionsToFactoryUI(perms) {
        // 1) Job Metrics
        if (!perms.can_edit_job_metrics) {
            const container = document.getElementById('modal-job-metrics-container');
            if (container) {
                container.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.classList.contains('add-package-group') ||
                        el.classList.contains('remove-package-group') ||
                        el.classList.contains('add-size-btn') ||
                        el.classList.contains('add-package-in-size') ||
                        el.classList.contains('remove-package-group-in-size') ||
                        el.classList.contains('remove-row')) {
                        hideElement(el);
                    } else {
                        markReadonly(el);
                    }
                });
            }
        }

        // 2) Machine Data
        if (!perms.can_edit_machine_data) {
            const tableBody = document.getElementById('production-table-body');
            if (tableBody) {
                tableBody.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.tagName === 'BUTTON') {
                        hideElement(el);
                    } else {
                        markReadonly(el);
                    }
                });
            }
            const addRowButtons = document.querySelectorAll('[data-role="add-production-row"], .add-production-row');
            addRowButtons.forEach(hideElement);
        }

        // 3) Production Steps
        if (!perms.can_edit_production_steps) {
            const stepInputs = document.querySelectorAll('input[name^="production_steps["]');
            stepInputs.forEach(markReadonly);
        }

        // 4) Invoice section
        if (!perms.can_edit_invoice) {
            const invoiceForm = document.getElementById('factoryInvoiceForm');
            if (invoiceForm) {
                invoiceForm.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.tagName === 'BUTTON') {
                        hideElement(el);
                    } else {
                        markReadonly(el);
                    }
                });
            }
        }

        // 5) Status/progress update controls
        if (!perms.can_edit_status) {
            const statusSelect = document.getElementById('modal-update-stage');
            const progressInput = document.getElementById('modal-progress-percentage');
            const notesInput = document.getElementById('modal-factory-notes');
            [statusSelect, progressInput, notesInput].forEach(markReadonly);

            const canEditAnything = perms.can_edit_job_metrics || perms.can_edit_machine_data || perms.can_edit_production_steps || perms.can_edit_invoice || perms.can_edit_status;
            if (!canEditAnything) {
                const saveBtn = document.querySelector('button[form="updateProductionStatusForm"], #updateProductionStatusForm button[type="submit"], #updateProductionStatusForm .btn-primary');
                if (saveBtn) hideElement(saveBtn);
            }
        }
    }

    // Kick off permissions fetch early
    fetchFactoryPermissions();

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
            // Re-apply permissions after async DOM injections
            setTimeout(() => {
                if (factoryPermsLoaded) {
                    applyPermissionsToFactoryUI(factoryPerms);
                }
            }, 150);
            
        } catch (error) {
            console.error('Error loading order details:', error);
            showAlert('خطا در بارگذاری جزئیات سفارش', 'danger');
        }
    }

    function populateModal(order) {
        console.log(order);
        
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
        // Peak Quantity (from order directly)
        const peakQuantityInvoice = document.getElementById('modalPeakQuantity');
        if (peakQuantityInvoice) {
            peakQuantityInvoice.value = (order.invoice_data?.peak_quantity) || order.peak_quantity || 0;
        }

        const peakQuantityStatus = document.getElementById('modalPeakQuantityStatus');
        if (peakQuantityStatus) {
            peakQuantityStatus.value = order.peak_quantity || 0;  // status uses order directly
        }
        const producedQuantity= document.getElementById('modalQuantityStatus');
        if (producedQuantity){
            producedQuantity.value = order.produced_quantity || 0;
        }
        const producedQuantityInvoice= document.getElementById('modalQuantity');
        if (producedQuantityInvoice){
            producedQuantityInvoice.value = order.produced_quantity || 0;
        }

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

            if (quantityInput) quantityInput.value = invoice.quantity || '';
            if (cuttingCostInput) cuttingCostInput.value = invoice.cutting_cost || '';
            if (numberOfCutsInput) numberOfCutsInput.value = invoice.number_of_cuts || '';
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

        // Ensure permissions are enforced after modal content is populated
        setTimeout(() => {
            if (factoryPermsLoaded) {
                applyPermissionsToFactoryUI(factoryPerms);
            }
        }, 120);
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

            // Also capture status-tab quantities as a fallback for invoice draft
            const qtyStatusEl = document.getElementById('modalQuantityStatus');
            const peakQtyStatusEl = document.getElementById('modalPeakQuantityStatus');
            if (qtyStatusEl || peakQtyStatusEl) {
                payload.invoice_data = payload.invoice_data || {};
                if (qtyStatusEl && qtyStatusEl.value) {
                    payload.invoice_data.quantity = payload.invoice_data.quantity || qtyStatusEl.value;
                }
                if (peakQtyStatusEl && peakQtyStatusEl.value) {
                    payload.invoice_data.peak_quantity = payload.invoice_data.peak_quantity || peakQtyStatusEl.value;
                }
            }

            const statusPeakInput = document.getElementById('modalPeakQuantityStatus');
            if (statusPeakInput) {
                payload.peak_quantity = statusPeakInput.value;
            }
            const producedQuantity = document.getElementById('modalQuantityStatus');
            if (producedQuantity) {
                payload.produced_quantity = producedQuantity.value;
            }
             
            const response = await fetch(`/factory/orders/${orderId}/update-production-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
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
    // helpers: parse ints/floats but return null if empty/invalid
    function parseIntSafe(v) {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        if (s === '') return null;
        const n = parseInt(s, 10);
        return Number.isNaN(n) ? null : n;
    }
    function parseFloatSafe(v) {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        if (s === '') return null;
        const n = parseFloat(s);
        return Number.isNaN(n) ? null : n;
    }

    const metrics = [];

    // Each metric row has class .metric-row
    document.querySelectorAll('#modal-job-metrics-container .metric-row').forEach((row) => {
        const metric = {};
        const modeSelect = row.querySelector('.size-toggle');
        const mode = modeSelect ? (modeSelect.value || 'single') : 'single';
        metric.mode = mode;

        if (mode === 'single') {
            // collect package groups for single mode
            metric.package_groups = [];
            const groups = row.querySelectorAll('.packages-groups .package-group');
            groups.forEach(pg => {
                // find numeric inputs inside the package-group (pack_size then count)
                const numberInputs = pg.querySelectorAll('input[type="number"]');
                const packSize = parseIntSafe(numberInputs[0]?.value);
                const count = parseIntSafe(numberInputs[1]?.value);
                if (packSize !== null && count !== null) {
                    metric.package_groups.push({ pack_size: packSize, count: count });
                }
            });

            // compute aggregate package_count if available (sum of counts)
            const totalPackages = metric.package_groups.reduce((s, g) => s + (g.count || 0), 0);
            metric.package_count = totalPackages || parseIntSafe(row.querySelector('input[name*="[package_count]"]')?.value) || 0;

            // optional package_value field (if present in UI)
            const pv = parseFloatSafe(row.querySelector('input[name*="[package_value]"]')?.value);
            if (pv !== null) metric.package_value = pv;

            // roll and meter are row-level in single mode
            const rc = parseIntSafe(row.querySelector('input[name*="[roll_count]"]')?.value);
            const mtr = parseFloatSafe(row.querySelector('input[name*="[meterage]"]')?.value);
            if (rc !== null) metric.roll_count = rc;
            if (mtr !== null) metric.meterage = mtr;

            // Only push metric if there is meaningful data
            const hasData = metric.package_groups.length || metric.roll_count != null || metric.meterage != null || metric.package_value != null;
            if (hasData) metrics.push(metric);

        } else if (mode === 'sizes') {
            // sizes mode: collect sizes list (each with name, package_groups, roll_count, meterage)
            metric.sizes = [];

            // Each .size-item is one size block
            row.querySelectorAll('.size-list .size-item').forEach(sizeItem => {
                const sizeObj = {};

                // size name: prefer explicit name input
                const nameInput = sizeItem.querySelector('input[type="text"], input[name*="[name]"]');
                sizeObj.name = nameInput ? (nameInput.value || '').trim() : '';

                // collect package groups inside this size
                sizeObj.package_groups = [];
                sizeItem.querySelectorAll('.package-group-in-size').forEach(pg => {
                    // for package-group-in-size, choose numeric inputs only (pack_size then count)
                    const numIns = pg.querySelectorAll('input[type="number"]');
                    // If the structure contains a text input inside pg, the numeric inputs will follow it
                    const packSize = parseIntSafe(numIns[0]?.value);
                    const count = parseIntSafe(numIns[1]?.value);
                    if (packSize !== null && count !== null) {
                        sizeObj.package_groups.push({ pack_size: packSize, count: count });
                    }
                });

                // per-size roll_count and meterage - look for inputs with classes we added
                const rcInput = sizeItem.querySelector('.size-roll-count') || sizeItem.querySelector('input[name*="[roll_count]"]');
                const mtrInput = sizeItem.querySelector('.size-meterage') || sizeItem.querySelector('input[name*="[meterage]"]');
                const rc = parseIntSafe(rcInput?.value);
                const mtr = parseFloatSafe(mtrInput?.value);
                if (rc !== null) sizeObj.roll_count = rc;
                if (mtr !== null) sizeObj.meterage = mtr;

                // Only include the size if it has useful data (name or package_groups or roll/meter)
                const hasSizeData = (sizeObj.name && sizeObj.name.length) || sizeObj.package_groups.length || sizeObj.roll_count != null || sizeObj.meterage != null;
                if (hasSizeData) {
                    metric.sizes.push(sizeObj);
                }
            });

            // if there are any sizes, push the metric
            if (metric.sizes.length) metrics.push(metric);
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
            'quantity', 'cutting_cost', 'number_of_cuts', 
            'peak_quantity', 'peak_width', 'Fee', 'row_number', 'notes'
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
            should_save_invoice: true,
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

    // Enforce permissions on dynamically added row
    if (!factoryPerms.can_edit_machine_data) {
        newRow.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (el.tagName === 'BUTTON') {
                hideElement(el);
            } else {
                markReadonly(el);
            }
        });
    }
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

            // Enforce permissions per row
            if (!factoryPerms.can_edit_machine_data) {
                newRow.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.tagName === 'BUTTON') {
                        hideElement(el);
                    } else {
                        markReadonly(el);
                    }
                });
            }
        });
    } else {
        addProductionRow();
    }

    // Optional: set saved duration if exists
    document.getElementById('production-duration-input').value = order.production_duration || '';

    calculateProductionDuration();

    // Re-apply permissions to entire machine section
    if (factoryPermsLoaded) {
        applyPermissionsToFactoryUI(factoryPerms);
    }
}


// === Replacement: support per-size roll_count and meterage ===

function addMetricRowToModal(metric = null) {
    const container = document.getElementById('modal-job-metrics-container');
    const existingRows = container.querySelectorAll('.metric-row');
    const index = existingRows.length;

    const newMetricRow = document.createElement('div');
    newMetricRow.className = 'metric-row border rounded p-3 mb-3 bg-light';

    newMetricRow.innerHTML = `
        <!-- Top: mode select (moved above the row header) -->
        <div class="row g-2 mb-2">
            <div class="col-md-3">
                <label class="form-label small text-muted">نوع ورودی</label>
                <select class="form-select form-select-sm size-toggle" name="job_metrics[${index}][mode]">
                    <option value="single">بدون سایز</option>
                    <option value="sizes">با سایز</option>
                </select>
            </div>
        </div>

        <!-- Row header and remove button -->
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="text-primary mb-0">ردیف شاخص #${index + 1}</h6>
            <button type="button" class="btn btn-sm btn-outline-danger remove-row">
                <i class="fas fa-trash-alt me-1"></i> حذف ردیف
            </button>
        </div>

        <div class="row g-2 align-items-end mb-3">
            <!-- single (no-size) mode: package groups (like 4 packages of 100) -->
            <div class="col-md-9 single-quantity">
                <label class="form-label small text-muted">گروه‌های بسته (مثلاً 4 بسته 100تایی)</label>
                <div class="packages-groups mb-2">
                    <div class="package-group d-flex gap-2 mb-2">
                        <input type="number" min="1" class="form-control form-control-sm w-50"
                            name="job_metrics[${index}][package_groups][0][pack_size]" placeholder="تعداد در هر بسته (مثلاً 100)"
                            value="${metric && metric.package_groups && metric.package_groups[0] ? metric.package_groups[0].pack_size || '' : ''}">
                        <input type="number" min="1" class="form-control form-control-sm w-25"
                            name="job_metrics[${index}][package_groups][0][count]" placeholder="تعداد بسته‌ها"
                            value="${metric && metric.package_groups && metric.package_groups[0] ? metric.package_groups[0].count || '' : ''}">
                        <button type="button" class="btn btn-sm btn-outline-danger remove-package-group">&times;</button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary add-package-group">
                    <i class="fas fa-plus-circle me-1"></i> افزودن گروه بسته
                </button>

                <!-- Roll and meter for single/no-size mode -->
                <div class="mt-3 d-flex gap-2 single-roll-meter">
                    <div class="w-25">
                        <label class="form-label small text-muted">تعداد رول</label>
                        <input type="number" class="form-control form-control-sm"
                            name="job_metrics[${index}][roll_count]"
                            value="${metric && !metric.sizes ? metric.roll_count || '' : ''}">
                    </div>
                    <div class="w-25">
                        <label class="form-label small text-muted">متراژ</label>
                        <input type="number" step="0.01" class="form-control form-control-sm"
                            name="job_metrics[${index}][meterage]"
                            value="${metric && !metric.sizes ? metric.meterage || '' : ''}">
                    </div>
                </div>
            </div>

            <!-- sizes mode: each size has its own package-groups list + roll/meter -->
            <div class="col-12 size-quantities d-none">
                <label class="form-label small text-muted d-block">تعداد بسته بر اساس سایز</label>
                <div class="size-list border rounded bg-white p-2 mb-2"></div>
                <button type="button" class="btn btn-sm btn-outline-primary add-size-btn">
                    <i class="fas fa-plus-circle me-1"></i> افزودن سایز
                </button>
            </div>
        </div>
    `;

    container.appendChild(newMetricRow);

    // If metric object passed, prefill data:
    if (metric) {
        // Fill package-groups for single mode (if present)
        if (metric.package_groups && metric.package_groups.length) {
            const groupsContainer = newMetricRow.querySelector('.packages-groups');
            groupsContainer.innerHTML = '';
            metric.package_groups.forEach((g, gi) => {
                const group = document.createElement('div');
                group.className = 'package-group d-flex gap-2 mb-2';
                group.innerHTML = `
                    <input type="number" min="1" class="form-control form-control-sm w-50"
                        name="job_metrics[${index}][package_groups][${gi}][pack_size]" placeholder="تعداد در هر بسته (مثلاً 100)"
                        value="${g.pack_size || ''}">
                    <input type="number" min="1" class="form-control form-control-sm w-25"
                        name="job_metrics[${index}][package_groups][${gi}][count]" placeholder="تعداد بسته‌ها"
                        value="${g.count || ''}">
                    <button type="button" class="btn btn-sm btn-outline-danger remove-package-group">&times;</button>
                `;
                groupsContainer.appendChild(group);
            });
        }

        // If metric has sizes, enable sizes mode and populate sizes
        if (metric.sizes && metric.sizes.length) {
            const row = newMetricRow;
            const toggle = row.querySelector('.size-toggle');
            toggle.value = 'sizes';
            row.querySelector('.single-quantity').classList.add('d-none');
            row.querySelector('.size-quantities').classList.remove('d-none');

            const sizeList = row.querySelector('.size-list');
            sizeList.innerHTML = '';

            metric.sizes.forEach((s, si) => {
                const sizeItem = document.createElement('div');
                sizeItem.className = 'size-item border rounded p-2 mb-2';

                // Build package groups HTML for this size
                let pkgGroupsHtml = '<div class="package-groups-for-size">';
                if (s.package_groups && s.package_groups.length) {
                    s.package_groups.forEach((pg, pgi) => {
                        pkgGroupsHtml += `
                            <div class="d-flex gap-2 mb-2 package-group-in-size">
                                <input type="text" class="form-control form-control-sm w-25"
                                    name="job_metrics[${index}][sizes][${si}][name]" value="${s.name || ''}" placeholder="سایز">
                                <input type="number" min="1" class="form-control form-control-sm w-25"
                                    name="job_metrics[${index}][sizes][${si}][package_groups][${pgi}][pack_size]" placeholder="تعداد در هر بسته"
                                    value="${pg.pack_size || ''}">
                                <input type="number" min="1" class="form-control form-control-sm w-25"
                                    name="job_metrics[${index}][sizes][${si}][package_groups][${pgi}][count]" placeholder="تعداد بسته‌ها"
                                    value="${pg.count || ''}">
                                <button type="button" class="btn btn-sm btn-outline-danger remove-package-group-in-size">&times;</button>
                            </div>
                        `;
                    });
                } else {
                    pkgGroupsHtml += `
                        <div class="d-flex gap-2 mb-2 package-group-in-size">
                            <input type="text" class="form-control form-control-sm w-25"
                                name="job_metrics[${index}][sizes][${si}][name]" value="${s.name || ''}" placeholder="سایز">
                            <input type="number" min="1" class="form-control form-control-sm w-25"
                                name="job_metrics[${index}][sizes][${si}][package_groups][0][pack_size]" placeholder="تعداد در هر بسته">
                            <input type="number" min="1" class="form-control form-control-sm w-25"
                                name="job_metrics[${index}][sizes][${si}][package_groups][0][count]" placeholder="تعداد بسته‌ها">
                            <button type="button" class="btn btn-sm btn-outline-danger remove-package-group-in-size">&times;</button>
                        </div>
                    `;
                }
                pkgGroupsHtml += '</div>';

                // Add roll and meter inputs per-size
                const rollMeterHtml = `
                    <div class="d-flex gap-2 mt-2 align-items-center">
                        <div class="w-25">
                            <label class="form-label small text-muted">تعداد رول (برای این سایز)</label>
                            <input type="number" class="form-control form-control-sm size-roll-count"
                                value="${s.roll_count || ''}">
                        </div>
                        <div class="w-25">
                            <label class="form-label small text-muted">متراژ (برای این سایز)</label>
                            <input type="number" step="0.01" class="form-control form-control-sm size-meterage"
                                value="${s.meterage || ''}">
                        </div>
                    </div>
                `;

                sizeItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong class="size-title">${s.name || 'سایز'}</strong>
                        <div>
                            <button type="button" class="btn btn-sm btn-outline-primary add-package-in-size">افزودن گروه بسته</button>
                            <button type="button" class="btn btn-sm btn-outline-danger remove-size">حذف سایز</button>
                        </div>
                    </div>
                    ${pkgGroupsHtml}
                    ${rollMeterHtml}
                `;
                sizeList.appendChild(sizeItem);
            });
        } else {
            // If single (no sizes) and metric has roll_count/meterage, fill them
            if (!metric.sizes || metric.sizes.length === 0) {
                const rollInSingle = newMetricRow.querySelector(`input[name="job_metrics[${index}][roll_count]"]`);
                const meterInSingle = newMetricRow.querySelector(`input[name="job_metrics[${index}][meterage]"]`);

                if (rollInSingle) rollInSingle.value = metric.roll_count ?? '';
                if (meterInSingle) meterInSingle.value = metric.meterage ?? '';
            }
        }
    }

    // Ensure indexes & names updated after adding
    reindexMetricRows();

    // Enforce permissions for job metrics on this newly added block
    if (!factoryPerms.can_edit_job_metrics) {
        newMetricRow.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (
                el.classList.contains('add-package-group') ||
                el.classList.contains('remove-package-group') ||
                el.classList.contains('add-size-btn') ||
                el.classList.contains('add-package-in-size') ||
                el.classList.contains('remove-package-group-in-size') ||
                el.classList.contains('remove-row') ||
                el.tagName === 'BUTTON'
            ) {
                hideElement(el);
            } else {
                markReadonly(el);
            }
        });
    }
}

// Reindex names for all dynamic fields including per-size roll/meter
function reindexMetricRows() {
    const rows = document.querySelectorAll('.metric-row');
    rows.forEach((row, rIndex) => {
        // update header number
        const header = row.querySelector('h6');
        if (header) header.textContent = `ردیف شاخص #${rIndex + 1}`;

        // mode select name
        const modeSelect = row.querySelector('.size-toggle');
        if (modeSelect) modeSelect.name = `job_metrics[${rIndex}][mode]`;

        // package groups (single/no-size)
        const packageGroups = row.querySelectorAll('.packages-groups .package-group');
        packageGroups.forEach((pg, pgIndex) => {
            const packSize = pg.querySelector('input[placeholder*="تعداد در هر بسته"]');
            const count = pg.querySelector('input[placeholder*="تعداد بسته‌ها"]');
            if (packSize) packSize.name = `job_metrics[${rIndex}][package_groups][${pgIndex}][pack_size]`;
            if (count) count.name = `job_metrics[${rIndex}][package_groups][${pgIndex}][count]`;
        });

        // For single (no-size) mode - ensure roll/meter inputs names are row-level
        const singleRoll = row.querySelector('.single-quantity input[name*="[roll_count]"]');
        const singleMeter = row.querySelector('.single-quantity input[name*="[meterage]"]');
        if (singleRoll) singleRoll.name = `job_metrics[${rIndex}][roll_count]`;
        if (singleMeter) singleMeter.name = `job_metrics[${rIndex}][meterage]`;

        // sizes and their inner package-groups + per-size roll/meter
        const sizeItems = row.querySelectorAll('.size-list .size-item');
        sizeItems.forEach((sizeItem, sIndex) => {
            // update size name input
            const sizeNameInput = sizeItem.querySelector('input[type="text"], input[placeholder*="سایز"]');
            if (sizeNameInput) sizeNameInput.name = `job_metrics[${rIndex}][sizes][${sIndex}][name]`;

            // package-groups inside size
            const pgInSize = sizeItem.querySelectorAll('.package-group-in-size');
            pgInSize.forEach((pgis, pgisIndex) => {
                const packSizeInput = pgis.querySelector('input[name*="[pack_size]"]');
                const countInput = pgis.querySelector('input[name*="[count]"]');
                if (packSizeInput) packSizeInput.name = `job_metrics[${rIndex}][sizes][${sIndex}][package_groups][${pgisIndex}][pack_size]`;
                if (countInput) countInput.name = `job_metrics[${rIndex}][sizes][${sIndex}][package_groups][${pgisIndex}][count]`;
            });

            // per-size roll and meter inputs
            const sizeRoll = sizeItem.querySelector('.size-roll-count');
            const sizeMeter = sizeItem.querySelector('.size-meterage');
            if (sizeRoll) sizeRoll.name = `job_metrics[${rIndex}][sizes][${sIndex}][roll_count]`;
            if (sizeMeter) sizeMeter.name = `job_metrics[${rIndex}][sizes][${sIndex}][meterage]`;

            // update visible title to match name input if available
            const title = sizeItem.querySelector('.size-title');
            if (title) {
                const nameVal = (sizeItem.querySelector(`input[name^="job_metrics[${rIndex}][sizes][${sIndex}][name]"]`) || {}).value || `سایز ${sIndex+1}`;
                title.textContent = nameVal;
            }
        });
    });
}

// event delegation for clicks and changes
document.addEventListener('click', function (e) {
    // add package group in single/no-size mode
    if (e.target.classList.contains('add-package-group')) {
        const row = e.target.closest('.metric-row');
        const groups = row.querySelector('.packages-groups');
        const rowIndex = Array.from(document.querySelectorAll('.metric-row')).indexOf(row);
        const groupIndex = groups.children.length;
        const group = document.createElement('div');
        group.className = 'package-group d-flex gap-2 mb-2';
        group.innerHTML = `
            <input type="number" min="1" class="form-control form-control-sm w-50"
                name="job_metrics[${rowIndex}][package_groups][${groupIndex}][pack_size]" placeholder="تعداد در هر بسته (مثلاً 100)">
            <input type="number" min="1" class="form-control form-control-sm w-25"
                name="job_metrics[${rowIndex}][package_groups][${groupIndex}][count]" placeholder="تعداد بسته‌ها">
            <button type="button" class="btn btn-sm btn-outline-danger remove-package-group">&times;</button>
        `;
        groups.appendChild(group);
        reindexMetricRows();
    }

    // remove package group in single mode
    if (e.target.classList.contains('remove-package-group')) {
        e.target.closest('.package-group').remove();
        reindexMetricRows();
    }

    // add a size to a metric-row (creates per-size package-group + roll/meter area)
    if (e.target.classList.contains('add-size-btn')) {
        const row = e.target.closest('.metric-row');
        const sizeList = row.querySelector('.size-list');
        const rowIndex = Array.from(document.querySelectorAll('.metric-row')).indexOf(row);
        const sizeIndex = sizeList.children.length;

        const sizeItem = document.createElement('div');
        sizeItem.className = 'size-item border rounded p-2 mb-2';
        sizeItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="size-title">سایز ${sizeIndex + 1}</strong>
                <div>
                    <button type="button" class="btn btn-sm btn-outline-primary add-package-in-size">افزودن گروه بسته</button>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-size">حذف سایز</button>
                </div>
            </div>
            <div class="d-flex gap-2 mb-2 package-group-in-size">
                <input type="text" class="form-control form-control-sm w-25"
                    name="job_metrics[${rowIndex}][sizes][${sizeIndex}][name]" placeholder="سایز (مثلا XL)">
                <input type="number" min="1" class="form-control form-control-sm w-25"
                    name="job_metrics[${rowIndex}][sizes][${sizeIndex}][package_groups][0][pack_size]" placeholder="تعداد در هر بسته">
                <input type="number" min="1" class="form-control form-control-sm w-25"
                    name="job_metrics[${rowIndex}][sizes][${sizeIndex}][package_groups][0][count]" placeholder="تعداد بسته‌ها">
                <button type="button" class="btn btn-sm btn-outline-danger remove-package-group-in-size">&times;</button>
            </div>
            <div class="d-flex gap-2 mt-2 align-items-center">
                <div class="w-25">
                    <label class="form-label small text-muted">تعداد رول (برای این سایز)</label>
                    <input type="number" class="form-control form-control-sm size-roll-count" value="">
                </div>
                <div class="w-25">
                    <label class="form-label small text-muted">متراژ (برای این سایز)</label>
                    <input type="number" step="0.01" class="form-control form-control-sm size-meterage" value="">
                </div>
            </div>
        `;
        sizeList.appendChild(sizeItem);
        reindexMetricRows();
    }

    // remove entire size
    if (e.target.classList.contains('remove-size')) {
        e.target.closest('.size-item').remove();
        reindexMetricRows();
    }

    // add package group inside a size
    if (e.target.classList.contains('add-package-in-size')) {
        const sizeItem = e.target.closest('.size-item');
        const row = e.target.closest('.metric-row');
        const rowIndex = Array.from(document.querySelectorAll('.metric-row')).indexOf(row);
        const sizeList = row.querySelectorAll('.size-item');
        const sizeIndex = Array.from(sizeList).indexOf(sizeItem);
        const groupIndex = sizeItem.querySelectorAll('.package-group-in-size').length;

        const group = document.createElement('div');
        group.className = 'd-flex gap-2 mb-2 package-group-in-size';
        group.innerHTML = `
            <input type="text" class="form-control form-control-sm w-25"
                name="job_metrics[${rowIndex}][sizes][${sizeIndex}][name]" placeholder="سایز (مثلا XL)">
            <input type="number" min="1" class="form-control form-control-sm w-25"
                name="job_metrics[${rowIndex}][sizes][${sizeIndex}][package_groups][${groupIndex}][pack_size]" placeholder="تعداد در هر بسته">
            <input type="number" min="1" class="form-control form-control-sm w-25"
                name="job_metrics[${rowIndex}][sizes][${sizeIndex}][package_groups][${groupIndex}][count]" placeholder="تعداد بسته‌ها">
            <button type="button" class="btn btn-sm btn-outline-danger remove-package-group-in-size">&times;</button>
        `;
        const pgContainer = sizeItem.querySelector('.package-groups-for-size') || sizeItem;
        pgContainer.appendChild(group);
        reindexMetricRows();
    }

    // remove package group inside size
    if (e.target.classList.contains('remove-package-group-in-size')) {
        e.target.closest('.package-group-in-size').remove();
        reindexMetricRows();
    }

    // remove the whole metric-row
    if (e.target.classList.contains('remove-row')) {
        e.target.closest('.metric-row').remove();
        reindexMetricRows();
    }
});

// toggle single/sizes view and reindex names correctly
document.addEventListener('change', function (e) {
    if (e.target.classList.contains('size-toggle')) {
        const row = e.target.closest('.metric-row');
        const single = row.querySelector('.single-quantity');
        const sizes = row.querySelector('.size-quantities');
        if (e.target.value === 'sizes') {
            single.classList.add('d-none');
            sizes.classList.remove('d-none');
        } else {
            single.classList.remove('d-none');
            sizes.classList.add('d-none');
        }
        reindexMetricRows();
    }

    // update visible size title when name edited
    if (e.target.matches('.size-item input[type="text"], .size-item input[placeholder*="سایز"]')) {
        const sizeItem = e.target.closest('.size-item');
        const title = sizeItem.querySelector('.size-title');
        if (title) title.textContent = e.target.value || title.textContent;
        reindexMetricRows();
    }
});

// ensure correct indexing after page load or server-fill
reindexMetricRows();

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



