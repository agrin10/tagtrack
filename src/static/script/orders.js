// Add showAlert function at the beginning of the file
window.showAlert = function(type, message, container = null) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // If no container specified, use the edit images card body
    if (!container) {
        container = document.querySelector('#edit-images .card-body');
    }

    // Insert alert at the top of the container
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function () {
            const orderId = this.getAttribute('data-order-id');
            
            fetch(`/orders/${orderId}`)
                .then(response => response.json())
                .then(data => {
                    const order = data.order;
                    
                    // Helper function to safely set text content
                    function setTextContent(elementId, value) {
                        const element = document.getElementById(elementId);
                        if (element) {
                            element.textContent = value || '-';
                        } else {
                            console.warn(`Element not found: ${elementId}`);
                        }
                    }
                    
                    // Update status badge and progress bar based on status
                    const statusElement = document.getElementById('detail-status');
                    const progressBar = document.getElementById('detail-status-progress');
                    const statusContainer = document.getElementById('detail-status-container');
                    
                    let statusClass, progressWidth, statursIcon;
                    
                    switch(order.status) {
                        case 'Completed':
                            statusClass = 'bg-success';
                            progressWidth = '100%';
                            statusIcon = '<i class="fas fa-check-circle me-1"></i>';
                            break;
                        case 'In Progress':
                            statusClass = 'bg-warning';
                            progressWidth = '60%';
                            statusIcon = '<i class="fas fa-spinner fa-spin me-1"></i>';
                            break;
                        default:
                            statusClass = 'bg-secondary';
                            progressWidth = '30%';
                            statusIcon = '<i class="fas fa-clock me-1"></i>';
                    }
                    
                    if (statusElement) {
                        statusElement.className = `badge fs-6 px-4 py-2 mb-2 ${statusClass}`;
                        statusElement.innerHTML = `${statusIcon}${order.status || '-'}`;
                    }
                    
                    if (progressBar) {
                        progressBar.className = `progress-bar ${statusClass}`;
                        progressBar.style.width = progressWidth;
                    }
                    
                    // Update all modal fields using the safe setter function
                    setTextContent('detail-form-number', order.form_number);
                    setTextContent('detail-customer-name', order.customer_name);
                    setTextContent('detail-sketch-name', order.sketch_name);
                    setTextContent('detail-file-name', order.file_name);
                    setTextContent('detail-fabric-density', order.fabric_density);
                    setTextContent('detail-fabric-code', order.fabric_cut);
                    setTextContent('detail-width', order.width ? `${order.width} cm` : null);
                    setTextContent('detail-height', order.height ? `${order.height} cm` : null);
                    setTextContent('detail-quantity', order.quantity);
                    setTextContent('detail-total-length-meters', order.total_length_meters ? `${order.total_length_meters} m` : null);
                    setTextContent('detail-fusing-type', order.fusing_type);
                    setTextContent('detail-lamination-type', order.lamination_type);
                    setTextContent('detail-cut-type', order.cut_type);
                    setTextContent('detail-label-type', order.label_type);
                    setTextContent('detail-design-specification', order.design_specification);
                    setTextContent('detail-office-notes', order.office_notes);
                    setTextContent('detail-factory-notes', order.factory_notes);
                    setTextContent('detail-customer-note-to-office', order.customer_note_to_office);
                    setTextContent('detail-delivery-date', order.delivery_date);
                    setTextContent('detail-exit-from-office-date', order.exit_from_office_date);
                    setTextContent('detail-exit-from-factory-date', order.exit_from_factory_date);
                    setTextContent('detail-created-at', order.created_at ? order.created_at.split('T')[0] : null);
                    setTextContent('detail-created-by-username', order.created_by_username);

                    // Handle images display
                    const imagesContainer = document.getElementById('detail-images-container');
                    const noImagesMessage = document.getElementById('detail-no-images-message');
                    
                    if (imagesContainer && noImagesMessage) {
                        if (order.images && order.images.length > 0) {
                            noImagesMessage.style.display = 'none';
                            imagesContainer.innerHTML = order.images.map(image => `
                                <div class="col-md-4 col-sm-6" data-image-id="${image.id}">
                                    <div class="card h-100">
                                        <img src="/orders/images/${image.id}" 
                                             class="card-img-top" 
                                             alt="${image.original_filename}"
                                             style="height: 200px; object-fit: cover; cursor: pointer;"
                                             onclick="previewDetailImage('${image.id}', '${image.original_filename}')">
                                        <div class="card-body p-2">
                                            <small class="text-muted text-truncate d-block">${image.original_filename}</small>
                                        </div>
                                    </div>
                                </div>
                            `).join('');
                        } else {
                            noImagesMessage.style.display = 'block';
                            imagesContainer.innerHTML = '';
                        }
                    }

                    // Show the modal
                    detailModal.show();
                })
                .catch(error => {
                    console.error('Error fetching order details:', error);
                    // Show error message in the modal
                    const modalBody = document.querySelector('#orderDetailsModal .modal-body');
                    if (modalBody) {
                        modalBody.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                Error loading order details: ${error.message}
                            </div>
                        `;
                    }
                });
        });
    });

    // Delete Order Functionality
    let orderToDelete = null;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteOrderModal'));
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Handle delete button click
    document.querySelectorAll('.delete-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            orderToDelete = this.getAttribute('data-order-id');
        });
    });

    // Handle confirm delete button click
    confirmDeleteBtn.addEventListener('click', function() {
        if (!orderToDelete) return;

        // Disable the delete button while processing
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';

        fetch(`/orders/${orderToDelete}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete order');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Show success message
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success alert-dismissible fade show';
                alertDiv.innerHTML = `
                    ${data.message || 'سفارش با موفقیت پاک شد !'}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));

                // Remove the row from the table
                const row = document.querySelector(`[data-order-id="${orderToDelete}"]`).closest('tr');
                if (row) {
                    row.remove();
                }

                // Close the modal
                deleteModal.hide();
            } else {
                throw new Error(data.error || 'Failed to delete order');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                ${error.message || 'An error occurred while deleting the order.'}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));
        })
        .finally(() => {
            // Reset the delete button state
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Delete Order';
            orderToDelete = null;
        });
    });

    // Reset orderToDelete when modal is closed
    document.getElementById('deleteOrderModal').addEventListener('hidden.bs.modal', function () {
        orderToDelete = null;
    });

    // Edit Order Functionality
    const editModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    const editForm = document.getElementById('editOrderForm');
    let currentOrderId = null;

    // Handle edit button click
    document.querySelectorAll('.edit-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            currentOrderId = this.getAttribute('data-order-id');
            const editBtn = this;
            
            // Disable the button and show loading state
            editBtn.disabled = true;
            const originalIcon = editBtn.innerHTML;
            editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Fetch order details
            fetch(`/orders/${currentOrderId}`)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'Failed to load order details');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.order) {
                        throw new Error('Order data not found');
                    }
                    
                    const order = data.order;
                    
                    // Update modal title
                    document.getElementById('edit-form-number').textContent = `#${order.form_number}`;
                    
                    // Populate form fields
                    document.getElementById('edit_form_number').value = order.form_number || '';
                    document.getElementById('edit_customer_name').value = order.customer_name || '';
                    document.getElementById('edit_sketch_name').value = order.sketch_name || '';
                    document.getElementById('edit_fabric_density').value = order.fabric_density || '';
                    document.getElementById('edit_fabric_cut').value = order.fabric_cut || '';
                    document.getElementById('edit_width').value = order.width || '';
                    document.getElementById('edit_height').value = order.height || '';
                    document.getElementById('edit_quantity').value = order.quantity || '';
                    document.getElementById('edit_total_length_meters').value = order.total_length_meters || '';
                    document.getElementById('edit_fusing_type').value = order.fusing_type || '';
                    document.getElementById('edit_lamination_type').value = order.lamination_type || '';
                    document.getElementById('edit_cut_type').value = order.cut_type || '';
                    document.getElementById('edit_label_type').value = order.label_type || '';
                    document.getElementById('edit_delivery_date').value = order.delivery_date || '';
                    document.getElementById('edit_exit_from_office_date').value = order.exit_from_office_date || '';
                    document.getElementById('edit_exit_from_factory_date').value = order.exit_from_factory_date || '';
                    document.getElementById('edit_status').value = order.status || 'Pending';
                    document.getElementById('edit_design_specification').value = order.design_specification || '';
                    document.getElementById('edit_office_notes').value = order.office_notes || '';
                    document.getElementById('edit_factory_notes').value = order.factory_notes || '';
                    document.getElementById('edit_customer_note_to_office').value = order.customer_note_to_office || '';
                    
                    // Format and set created_at datetime
                    if (order.created_at) {
                        const createdDate = new Date(order.created_at);
                        const year = createdDate.getFullYear();
                        const month = String(createdDate.getMonth() + 1).padStart(2, '0');
                        const day = String(createdDate.getDate()).padStart(2, '0');
                        const hours = String(createdDate.getHours()).padStart(2, '0');
                        const minutes = String(createdDate.getMinutes()).padStart(2, '0');
                        const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
                        document.getElementById('edit_created_at').value = formattedDateTime;
                    } else {
                        document.getElementById('edit_created_at').value = '';
                    }

                    // Set the order ID for image handling
                    document.getElementById('editOrderForm').dataset.orderId = currentOrderId;
                    
                    // Load images for the order
                    const container = document.getElementById('edit-order-images-container');
                    const noImagesMessage = document.getElementById('edit-no-images-message');
                    
                    if (container && noImagesMessage) {
                        if (order.images && order.images.length > 0) {
                            noImagesMessage.style.display = 'none';
                            const imageHtml = order.images.map(image => `
                                <div class="col-md-4 col-sm-6" data-image-id="${image.id}">
                                    <div class="card h-100">
                                        <img src="/orders/images/${image.id}" 
                                             class="card-img-top" 
                                             alt="${image.original_filename}"
                                             style="height: 200px; object-fit: cover; cursor: pointer;"
                                             onclick="previewEditImage('${image.id}', '${image.original_filename}')">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <small class="text-muted text-truncate">${image.original_filename}</small>
                                                <button class="btn btn-sm btn-danger" onclick="deleteEditImage(${image.id})">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('');
                            
                            container.innerHTML = imageHtml;
                        } else {
                            noImagesMessage.style.display = 'block';
                            container.innerHTML = '';
                        }
                    }
                    
                    // Update form action
                    editForm.action = `/orders/${currentOrderId}`;
                    
                    // Show the modal
                    editModal.show();

                    // After loading images, initialize click handlers
                    setTimeout(updateImageCardClickHandlers, 100);
                })
                .catch(error => {
                    console.error('Error:', error);
                    // Show error message
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
                    alertDiv.innerHTML = `
                        <strong>Error loading order details:</strong> ${error.message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));
                })
                .finally(() => {
                    // Reset the button state
                    editBtn.disabled = false;
                    editBtn.innerHTML = originalIcon;
                });
        });
    });

    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

        // Get all form fields except images
        const formFields = Array.from(this.elements).filter(element => 
            element.name && 
            element.name !== 'images' && 
            element.type !== 'file'
        );

        const data = {};
        formFields.forEach(element => {
            if (element.name === 'created_at' && element.value) {
                // Convert datetime-local input to ISO string
                const date = new Date(element.value);
                data[element.name] = date.toISOString();
            } else {
                data[element.name] = element.value === '' ? null : element.value;
            }
        });

        // Log the data being sent
        console.log('Sending update data:', data);

        fetch(this.action, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(async response => {
            const responseData = await response.json();
            console.log('Server response:', responseData); // Log the full response

            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || 'Failed to update order');
            }
            return responseData;
        })
        .then(data => {
            // Show success message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success alert-dismissible fade show';
            alertDiv.innerHTML = `
                Order updated successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));

            // Close the modal
            editModal.hide();

            // Reload the page to show updated data
            window.location.reload();
        })
        .catch(error => {
            console.error('Update error:', error);
            // Show error message with more details
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                <strong>Error updating order:</strong> ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));
        })
        .finally(() => {
            // Reset the submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        });
    });

    // Reset form when modal is closed
    document.getElementById('editOrderModal').addEventListener('hidden.bs.modal', function () {
        currentOrderId = null;
        editForm.reset();
    });

    // Duplicate Order Functionality
    document.querySelectorAll('.duplicate-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const duplicateBtn = this;
            
            // Disable the button and show loading state
            duplicateBtn.disabled = true;
            const originalIcon = duplicateBtn.innerHTML;
            duplicateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            fetch(`/orders/${orderId}/duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Failed to duplicate order');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Create and show success flash message
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-success alert-dismissible fade show';
                    alertDiv.innerHTML = `
                        ${data.message || 'سفارش با موفقیت کپی شد!'}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));
                    
                    // Reload the page after a short delay to show the flash message
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Failed to duplicate order');
                }
            })
            .catch(error => {
                console.error('Error duplicating order:', error);
                // Create and show error flash message
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger alert-dismissible fade show';
                alertDiv.innerHTML = `
                    <strong>Error duplicating order:</strong> ${error.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.card'));
            })
            .finally(() => {
                // Reset the button state
                duplicateBtn.disabled = false;
                duplicateBtn.innerHTML = originalIcon;
            });
        });
    });

    // Export to Excel functionality
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            const statusFilterDropdown = document.getElementById('statusFilterDropdown');

            const currentSearch = searchInput ? searchInput.value : '';
            const currentStatus = statusFilterDropdown ? statusFilterDropdown.getAttribute('data-current-status') || 'all' : 'all';

            let exportUrl = `/orders/export/excel?`;
            const params = [];

            if (currentSearch) {
                params.push(`search=${encodeURIComponent(currentSearch)}`);
            }
            if (currentStatus && currentStatus !== 'all') {
                params.push(`status=${encodeURIComponent(currentStatus)}`);
            }

            exportUrl += params.join('&');

            window.location.href = exportUrl;
        });
    }

    // Filter Elements
    const statusItems = document.querySelectorAll('.filter-status');
    const statusBtn = document.getElementById('statusFilterDropdown');
    const statusText = document.getElementById('statusFilterText');
    const statusBadge = document.getElementById('statusFilterBadge');
    const searchInput = document.getElementById('searchInput');
    const rows = Array.from(document.querySelectorAll('#ordersTable tbody tr'));
    const customerFilter = document.getElementById('customerFilter');
    const sketchFilter = document.getElementById('sketchFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const activeFiltersBadge = document.getElementById('activeFiltersBadge');
    const filterCollapse = document.getElementById('filterCollapse');
  
    let currentStatus = 'all';
    let currentSearch = '';
    let activeFilters = 0;

    // Initialize from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search');
    const initialStatus = urlParams.get('status');

    if (searchInput && initialSearch) {
        searchInput.value = initialSearch;
        currentSearch = initialSearch;
    }

    if (statusBtn && initialStatus) {
        const selectedStatusLink = document.querySelector(`.filter-status[data-status="${initialStatus}"]`);
        if (selectedStatusLink) {
            currentStatus = initialStatus;
            updateFilterButton(currentStatus);
        }
    }
    
    // Function to count active filters
    function updateActiveFiltersCount() {
        let count = 0;
        if (currentStatus !== 'all') count++;
        if (currentSearch) count++;
        if (customerFilter && customerFilter.value) count++;
        if ((dateFromFilter && dateFromFilter.value) || (dateToFilter && dateToFilter.value)) count++;
        
        if (activeFiltersBadge) {
            activeFilters = count;
            activeFiltersBadge.textContent = count;
            activeFiltersBadge.className = `badge rounded-pill ${count > 0 ? 'bg-primary' : 'bg-secondary'}`;
        }
    }
    
    // Function to clear all filters
    function clearAllFilters() {
        currentStatus = 'all';
        currentSearch = '';
        if (customerFilter) customerFilter.value = '';
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';
        if (searchInput) searchInput.value = '';
        
        updateFilterButton('all');
        updateActiveFiltersCount();
        filterRows();
    }
    
    // Function to check if a date is within range
    function isDateInRange(dateStr, fromDate, toDate) {
        if (!dateStr) return false; // Changed to false to not show rows with no date
        
        try {
            // Parse the date string from the table
            let orderDate;
            if (dateStr.includes('T')) {
                // If it's a datetime string (created_at)
                orderDate = new Date(dateStr);
            } else {
                // If it's just a date string (delivery_date)
                const [year, month, day] = dateStr.split('-').map(Number);
                orderDate = new Date(year, month - 1, day);
            }
            
            // If no filters are set, return true
            if (!fromDate && !toDate) return true;
            
            // Parse filter dates
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            
            // Set time to start of day for from date and end of day for to date
            if (from) {
                from.setHours(0, 0, 0, 0);
            }
            if (to) {
                to.setHours(23, 59, 59, 999);
            }
            
            // For delivery dates, compare only the date part
            if (!dateStr.includes('T')) {
                orderDate.setHours(0, 0, 0, 0);
            }
            
            // Check if date is within range
            if (from && orderDate < from) return false;
            if (to && orderDate > to) return false;
            
            return true;
        } catch (error) {
            console.error('Error comparing dates:', error, 'for date string:', dateStr);
            return false; // Changed to false to not show rows with invalid dates
        }
    }

    // Function to check if either date is in range
    function isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate) {
        // For created date, we want to check if it's within the range
        const createdInRange = createdDate ? isDateInRange(createdDate, fromDate, toDate) : false;
        
        // For delivery date, we want to check if it's within the range
        const deliveryInRange = deliveryDate ? isDateInRange(deliveryDate, fromDate, toDate) : false;
        
        // A row should be shown only if at least one date falls within the range
        return createdInRange || deliveryInRange;
    }

    // Function to update filter button appearance
    function updateFilterButton(status) {
        if (!statusBadge || !statusText) return;

        let badgeClass, badgeText, statusDisplayText;
        
        switch(status.toLowerCase()) {
            case 'completed':
                badgeClass = 'bg-success';
                badgeText = 'تکمیل شده';
                statusDisplayText = 'تکمیل شده';
                break;
            case 'in progress':
                badgeClass = 'bg-warning';
                badgeText = 'در حال انجام';
                statusDisplayText = 'در حال انجام';
                break;
            case 'pending':
                badgeClass = 'bg-secondary';
                badgeText = 'در انتظار';
                statusDisplayText = 'در انتظار';
                break;
            default:
                badgeClass = 'bg-secondary';
                badgeText = 'همه';
                statusDisplayText = 'همه وضعیت‌ها';
        }
        
        statusBadge.className = `badge rounded-pill ${badgeClass}`;
        statusBadge.textContent = badgeText;
        statusText.textContent = statusDisplayText;
        
        // Update active state in dropdown
        if (statusItems) {
            statusItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.status.toLowerCase() === status.toLowerCase()) {
                    item.classList.add('active');
                }
            });
        }
    }
    function mapStatusToPersian(statusKey) {
    const mapping = {
        'completed': 'تکمیل شده',
        'in progress': 'در حال انجام',
        'pending': 'در انتظار',
        'all': 'all'
    };
        return mapping[statusKey.toLowerCase()] || statusKey;
    }

  
    // Enhanced filter function
    function filterRows() {
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const customerText = customerFilter ? customerFilter.value.trim().toLowerCase() : '';
    const sketchText = sketchFilter && !sketchFilter.disabled ? sketchFilter.value.trim().toLowerCase() : '';
    const fromDate = dateFromFilter ? dateFromFilter.value : '';
    const toDate = dateToFilter ? dateToFilter.value : '';

    let visibleCount = 0;
    rows.forEach(row => {
        // Status check
        const badge = row.querySelector('td:nth-child(8) .badge');
        const status = badge ? badge.textContent.trim().toLowerCase() : '';
        const mappedStatus = mapStatusToPersian(currentStatus);
        const statusMatch = mappedStatus === 'all' || status === mappedStatus;

        // Sketch name check (assume sketch is in column 3)
        const sketchCell = row.querySelector('td:nth-child(3)');
        const sketchName = sketchCell ? sketchCell.textContent.trim().toLowerCase() : '';
        const sketchMatch = !sketchText || sketchName.includes(sketchText);

        // Customer name check (assume customer is in column 4)
        const customerCell = row.querySelector('td:nth-child(4)');
        const customerName = customerCell ? customerCell.textContent.trim().toLowerCase() : '';
        const customerMatch = !customerText || customerName.includes(customerText);

        // Date checks
        const createdDateCell = row.querySelector('td:nth-child(2)');
        const deliveryDateCell = row.querySelector('td:nth-child(9)');
        const createdDate = createdDateCell ? createdDateCell.getAttribute('title') : null;
        const deliveryDate = deliveryDateCell ? deliveryDateCell.textContent.trim() : null;
        const dateMatch = isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate);

        // Search text check (across all cells)
        const rowText = Array.from(row.cells)
            .map(cell => cell.textContent.trim().toLowerCase())
            .join(' ');
        const searchMatch = !searchText || rowText.includes(searchText);

        // Show row only if all conditions match
        const shouldShow = statusMatch && customerMatch && sketchMatch && dateMatch && searchMatch;
        row.style.display = shouldShow ? '' : 'none';

        if (shouldShow) visibleCount++;
    });

    // Optionally update a badge or counter
    if (activeFiltersBadge) {
        activeFiltersBadge.textContent = visibleCount;
    }
}
  
    // Event Listeners
    if (statusItems) {
        statusItems.forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                currentStatus = item.dataset.status;
                updateFilterButton(currentStatus);
                filterRows();
            });
        });
    }
  
    setupTableSearch('#searchInput', '#ordersTable tbody tr');
    
    if (customerFilter && sketchFilter) {
        customerFilter.addEventListener('input', () => {
            if (customerFilter.value.trim()) {
                sketchFilter.disabled = false;
            } else {
                sketchFilter.value = '';
                sketchFilter.disabled = true;
            }
            filterRows();
        });
        sketchFilter.addEventListener('input', filterRows);
    }

    
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', () => {
            console.log('Date from changed:', dateFromFilter.value);
            filterRows();
        });
    }
    
    if (dateToFilter) {
        dateToFilter.addEventListener('change', () => {
            console.log('Date to changed:', dateToFilter.value);
            filterRows();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            clearAllFilters();
        });
    }
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default form submission
            console.log('Apply filters button clicked');
            
            // Update current search value
            if (searchInput) {
                currentSearch = searchInput.value;
            }
            
            // Force filter update
            filterRows();
            
            // Close the filter collapse if on mobile
            if (window.innerWidth < 768 && filterCollapse) {
                const bsCollapse = new bootstrap.Collapse(filterCollapse);
                bsCollapse.hide();
            }
        });
    }
    
    // Initialize filters
    console.log('Initializing filters...');
    updateFilterButton('all');
    updateActiveFiltersCount();
    filterRows(); // Initial filter pass

    // Initialize variables for edit modal image handling
    let editSelectedImages = [];

    // Handle image selection in edit modal
    const editOrderImages = document.getElementById('editOrderImages');
    if (editOrderImages) {
        editOrderImages.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const previewContainer = document.getElementById('editImagePreviewContainer');
            const orderId = document.getElementById('editOrderForm').dataset.orderId;
            
            if (!orderId) {
                console.error('No order ID found');
                return;
            }
            
            files.forEach((file, index) => {
                if (file.size > 10 * 1024 * 1024) { // 10MB
                    alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                    return;
                }
                
                if (!file.type.startsWith('image/')) {
                    alert(`File ${file.name} is not an image.`);
                    return;
                }
                
                // Create preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    const col = document.createElement('div');
                    col.className = 'col-md-3 col-sm-4 col-6';
                    col.innerHTML = `
                        <div class="card h-100">
                            <img src="${e.target.result}" class="card-img-top" style="height: 150px; object-fit: cover;">
                            <div class="card-body p-2">
                                <small class="text-muted d-block text-truncate">${file.name}</small>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <button type="button" class="btn btn-sm btn-danger" onclick="removeEditImage(${index})">
                                        <i class="fas fa-trash-alt"></i> Remove
                                    </button>
                                    <button type="button" class="btn btn-sm btn-primary" onclick="uploadEditImage(${index}, '${orderId}')">
                                        <i class="fas fa-upload"></i> Upload
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(col);
                };
                reader.readAsDataURL(file);
                editSelectedImages.push(file);
            });
        });
    }

    // Remove image from edit selection
    window.removeEditImage = function(index) {
        editSelectedImages.splice(index, 1);
        document.getElementById('editOrderImages').value = ''; // Clear file input
        // Recreate previews
        const previewContainer = document.getElementById('editImagePreviewContainer');
        previewContainer.innerHTML = '';
        const orderId = document.getElementById('editOrderForm').dataset.orderId;
        
        editSelectedImages.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const col = document.createElement('div');
                col.className = 'col-md-3 col-sm-4 col-6';
                col.innerHTML = `
                    <div class="card h-100">
                        <img src="${e.target.result}" class="card-img-top" style="height: 150px; object-fit: cover;">
                        <div class="card-body p-2">
                            <small class="text-muted d-block text-truncate">${file.name}</small>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <button type="button" class="btn btn-sm btn-danger" onclick="removeEditImage(${idx})">
                                    <i class="fas fa-trash-alt"></i> Remove
                                </button>
                                <button type="button" class="btn btn-sm btn-primary" onclick="uploadEditImage(${idx}, '${orderId}')">
                                    <i class="fas fa-upload"></i> Upload
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                previewContainer.appendChild(col);
            };
            reader.readAsDataURL(file);
        });
    };

    // Make uploadEditImage a global function
    window.uploadEditImage = async function(index) {
        const image = editSelectedImages[index];
        if (!image) {
            console.error('No image found at index:', index);
            showAlert('error', 'No image found. Please try again.');
            return;
        }

        const orderId = document.getElementById('editOrderForm').dataset.orderId;
        if (!orderId) {
            console.error('No order ID found');
            showAlert('error', 'No order ID found. Please try again.');
            return;
        }

        const formData = new FormData();
        formData.append('file', image);

        const uploadBtn = document.querySelector(`#editImagePreviewContainer [data-index="${index}"] .upload-btn`);
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            console.log('Uploading image for order:', orderId);
            const response = await fetch(`/orders/${orderId}/images`, {
                method: 'POST',
                body: formData
            });

            console.log('Upload response status:', response.status);
            const data = await response.json();
            console.log('Upload response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }

            // Show success message
            showAlert('success', 'Image uploaded successfully');

            // Add the new image to the display
            const imageContainer = document.getElementById('edit-order-images-container');
            const noImagesMessage = document.getElementById('edit-no-images-message');
            
            if (imageContainer) {
                // Create image card
                const imageCard = createImageCard(data.image);
                imageContainer.appendChild(imageCard);
                
                // Hide no images message if it exists
                if (noImagesMessage) {
                    noImagesMessage.style.display = 'none';
                }
            }

            // Remove the uploaded image from the preview
            editSelectedImages.splice(index, 1);
            updateEditImagePreviews();

        } catch (error) {
            console.error('Error uploading image:', error);
            showAlert('error', error.message || 'Failed to upload image');
            
            // Reset upload button state
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i>';
            }
        }
    };

    // Reset edit modal when closed
    document.getElementById('editOrderModal').addEventListener('hidden.bs.modal', function () {
        // Clear selected images
        editSelectedImages = [];
        const editOrderImages = document.getElementById('editOrderImages');
        if (editOrderImages) {
            editOrderImages.value = '';
        }
        const previewContainer = document.getElementById('editImagePreviewContainer');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
    });

    // Update the image card click handler in the edit form
    function updateImageCardClickHandlers() {
        const imageCards = document.querySelectorAll('#edit-order-images-container .card img');
        imageCards.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', function() {
                const imageId = this.closest('[data-image-id]').getAttribute('data-image-id');
                const filename = this.alt;
                previewEditImage(imageId, filename);
            });
        });
    }

    // Add function to delete images
    window.deleteEditImage = function(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        // Get the image card element before deletion
        const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
        if (!imageCard) {
            console.error('Image card not found:', imageId);
            return;
        }

        // Show loading state on the delete button
        const deleteBtn = imageCard.querySelector('.btn-danger');
        if (deleteBtn) {
            const originalContent = deleteBtn.innerHTML;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        // Create a temporary alert container if it doesn't exist
        let alertContainer = document.querySelector('#edit-images .alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.className = 'alert-container';
            const uploadForm = document.querySelector('#editImageUploadForm');
            if (uploadForm) {
                uploadForm.parentNode.insertBefore(alertContainer, uploadForm);
            }
        }

        console.log('Attempting to delete image:', imageId); // Debug log

        fetch(`/orders/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(async response => {
            console.log('Delete response status:', response.status); // Debug log
            const data = await response.json();
            console.log('Delete response data:', data); // Debug log
            
            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Failed to delete image';
                console.error('Server error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });
                throw new Error(errorMessage);
            }
            
            // Consider both response formats as valid:
            // 1. { success: true, message: '...' }
            // 2. { message: '...' }
            if (data.success === false) {
                const errorMessage = data.error || data.message || 'Server reported failure to delete image';
                console.error('Server reported failure:', {
                    status: response.status,
                    data: data
                });
                throw new Error(errorMessage);
            }
            
            // If we have a message and no explicit failure, consider it a success
            if (!data.message) {
                console.warn('Unexpected response format - no message field:', data);
            }
            
            return data;
        })
        .then(data => {
            console.log('Image deletion successful:', data); // Debug log
            
            // Remove the image card from the display
            if (imageCard) {
                imageCard.remove();
            }

            // Show success message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="fas fa-check-circle me-2"></i>${data.message || 'Image deleted successfully!'}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            alertContainer.innerHTML = ''; // Clear any existing alerts
            alertContainer.appendChild(alertDiv);

            // Auto-dismiss the success message after 3 seconds
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }, 3000);

            // Check if there are any images left
            const container = document.getElementById('edit-order-images-container');
            const noImagesMessage = document.getElementById('edit-no-images-message');
            if (container && noImagesMessage && container.children.length === 0) {
                noImagesMessage.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error deleting image:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
            
            // Reset the delete button state
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }

            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>Error deleting image:</strong> ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            alertContainer.innerHTML = ''; // Clear any existing alerts
            alertContainer.appendChild(alertDiv);

            // Auto-dismiss the error message after 5 seconds
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }, 5000);
        });
    };

    // Add image preview function for details modal
    window.previewDetailImage = function(imageId, filename) {
        // Create modal for image preview if it doesn't exist
        let previewModal = document.getElementById('detailImagePreviewModal');
        if (!previewModal) {
            previewModal = document.createElement('div');
            previewModal.id = 'detailImagePreviewModal';
            previewModal.className = 'modal fade';
            previewModal.setAttribute('tabindex', '-1');
            previewModal.setAttribute('aria-hidden', 'true');
            previewModal.setAttribute('data-bs-backdrop', 'false');
            previewModal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content shadow-lg">
                        <div class="modal-header bg-light">
                            <h5 class="modal-title">
                                <i class="fas fa-image me-2"></i>${filename}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center p-0 position-relative">
                            <div class="spinner-border text-primary position-absolute top-50 start-50 translate-middle" role="status" id="detailPreviewImageSpinner">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <img src="/orders/images/${imageId}" 
                                 class="img-fluid" 
                                 alt="${filename}"
                                 style="max-height: 80vh; width: auto;"
                                 onload="document.getElementById('detailPreviewImageSpinner').style.display='none'"
                                 onerror="this.onerror=null; this.src='/static/img/error-image.png'; document.getElementById('detailPreviewImageSpinner').style.display='none';">
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Close
                            </button>
                            <a href="/orders/images/${imageId}" 
                               class="btn btn-primary" 
                               download="${filename}"
                               target="_blank">
                                <i class="fas fa-download me-2"></i>Download
                            </a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(previewModal);

            // Add keyboard navigation
            previewModal.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const modal = bootstrap.Modal.getInstance(previewModal);
                    if (modal) {
                        modal.hide();
                    }
                }
            });
        } else {
            // Update existing modal content
            previewModal.querySelector('.modal-title').innerHTML = `<i class="fas fa-image me-2"></i>${filename}`;
            const img = previewModal.querySelector('img');
            const spinner = document.getElementById('detailPreviewImageSpinner');
            
            // Show spinner while loading
            if (spinner) spinner.style.display = 'block';
            
            // Update image source
            img.src = `/orders/images/${imageId}`;
            img.alt = filename;
            
            // Update download link
            const downloadBtn = previewModal.querySelector('a[download]');
            if (downloadBtn) {
                downloadBtn.href = `/orders/images/${imageId}`;
                downloadBtn.download = filename;
            }
        }

        // Show the modal with no backdrop
        const modal = new bootstrap.Modal(previewModal, {
            backdrop: false,
            keyboard: true
        });
        modal.show();

        // Handle modal hidden event
        previewModal.addEventListener('hidden.bs.modal', function () {
            // Reset the image source to clear memory
            const img = previewModal.querySelector('img');
            if (img) img.src = '';
        }, { once: true });
    };

    // Update the showOrderDetails function to include image click handlers
    function showOrderDetails(orderId) {
        console.log('Loading details for order:', orderId);
        
        // Get the modal element
        const modal = document.getElementById('orderDetailsModal');
        if (!modal) {
            console.error('Order details modal not found');
            return;
        }

        // Show loading state
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading order details...</p>
                </div>
            `;
        }

        // Show the modal first
        const detailModal = new bootstrap.Modal(modal);
        detailModal.show();

        // Wait for the modal to be fully shown before loading data
        modal.addEventListener('shown.bs.modal', function onModalShown() {
            // Remove the event listener to prevent multiple calls
            modal.removeEventListener('shown.bs.modal', onModalShown);

            // Now fetch the order details
            fetch(`/orders/${orderId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch order details');
                    }
                    return response.json();
                })
                    .then(data => {
                        const order = data.order;
                    console.log('Order data:', order);

                    // Helper function to safely set text content
                    function setTextContent(elementId, value) {
                        const element = document.getElementById(elementId);
                        if (element) {
                            element.textContent = value || '-';
                        } else {
                            console.warn(`Element not found: ${elementId}`);
                        }
                    }

                    // Update status badge and progress bar
                    const statusContainer = document.getElementById('detail-status-container');
                    if (statusContainer) {
                        const statusBadge = document.getElementById('detail-status');
                        const progressBar = document.getElementById('detail-status-progress');
                        
                        if (statusBadge && progressBar) {
                            let statusClass = 'bg-secondary';
                            let progress = 0;
                            
                            switch (order.status) {
                                case 'Pending':
                                    statusClass = 'bg-warning';
                                    progress = 25;
                                    break;
                                case 'In Progress':
                                    statusClass = 'bg-info';
                                    progress = 50;
                                    break;
                                case 'In Factory':
                                    statusClass = 'bg-primary';
                                    progress = 75;
                                    break;
                                case 'Completed':
                                    statusClass = 'bg-success';
                                    progress = 100;
                                    break;
                            }
                            
                            statusBadge.className = `badge fs-6 px-4 py-2 mb-2 ${statusClass}`;
                            statusBadge.textContent = order.status;
                            progressBar.className = `progress-bar ${statusClass}`;
                            progressBar.style.width = `${progress}%`;
                        }
                    }

                    // Update form number
                    setTextContent('detail-form-number', order.form_number);

                    // Update all other fields
                    setTextContent('detail-customer-name', order.customer_name);
                    setTextContent('detail-sketch-name', order.sketch_name);
                    setTextContent('detail-file-name', order.file_name);
                    setTextContent('detail-fabric-density', order.fabric_density);
                    setTextContent('detail-fabric-code', order.fabric_cut);
                    setTextContent('detail-width', order.width ? `${order.width} cm` : null);
                    setTextContent('detail-height', order.height ? `${order.height} cm` : null);
                    setTextContent('detail-quantity', order.quantity);
                    setTextContent('detail-total-length-meters', order.total_length_meters ? `${order.total_length_meters} m` : null);
                    setTextContent('detail-fusing-type', order.fusing_type);
                    setTextContent('detail-lamination-type', order.lamination_type);
                    setTextContent('detail-cut-type', order.cut_type);
                    setTextContent('detail-label-type', order.label_type);
                    setTextContent('detail-design-specification', order.design_specification);
                    setTextContent('detail-office-notes', order.office_notes);
                    setTextContent('detail-factory-notes', order.factory_notes);
                    setTextContent('detail-customer-note-to-office', order.customer_note_to_office);
                    setTextContent('detail-delivery-date', order.delivery_date);
                    setTextContent('detail-exit-from-office-date', order.exit_from_office_date);
                    setTextContent('detail-exit-from-factory-date', order.exit_from_factory_date);
                    setTextContent('detail-created-at', order.created_at ? order.created_at.split('T')[0] : null);
                    setTextContent('detail-created-by-username', order.created_by_username);

                    // Handle images display
                    const imagesContainer = document.getElementById('detail-images-container');
                    const noImagesMessage = document.getElementById('detail-no-images-message');
                    
                    if (imagesContainer && noImagesMessage) {
                        if (order.images && order.images.length > 0) {
                            noImagesMessage.style.display = 'none';
                            imagesContainer.innerHTML = order.images.map(image => `
                                    <div class="col-md-4 col-sm-6" data-image-id="${image.id}">
                                    <div class="card h-100">
                                        <img src="/orders/images/${image.id}" 
                                             class="card-img-top" 
                                             alt="${image.original_filename}"
                                             style="height: 200px; object-fit: cover; cursor: pointer;"
                                             onclick="previewDetailImage('${image.id}', '${image.original_filename}')">
                                    <div class="card-body p-2">
                                        <small class="text-muted text-truncate d-block">${image.original_filename}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                        } else {
                            noImagesMessage.style.display = 'block';
                            imagesContainer.innerHTML = '';
                        }
                    }

                    // Show the modal
                    detailModal.show();
                })
                .catch(error => {
                    console.error('Error fetching order details:', error);
                    // Show error message in the modal
                    if (modalBody) {
                        modalBody.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                Error loading order details: ${error.message}
                            </div>
                        `;
                    }
                });
        });
    }
});