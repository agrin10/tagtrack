document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function () {
            const orderId = this.getAttribute('data-order-id');

            fetch(`/orders/${orderId}`)
                .then(response => response.json())
                .then(data => {
                    const order = data.order;
                    
                    // Update status badge and progress bar based on status
                    const statusElement = document.getElementById('detail-status');
                    const progressBar = document.getElementById('detail-status-progress');
                    const statusContainer = document.getElementById('detail-status-container');
                    
                    let statusClass, progressWidth, statusIcon;
                    
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
                    
                    // Update other modal fields
                    document.getElementById('detail-form-number').textContent = order.form_number;
                    document.getElementById('detail-customer-name').textContent = order.customer_name || '-';
                    document.getElementById('detail-sketch-name').textContent = order.sketch_name || '-';
                    document.getElementById('detail-file-name').textContent = order.file_name || '-';
                    document.getElementById('detail-fabric-density').textContent = order.fabric_density || '-';
                    document.getElementById('detail-fabric-code').textContent = order.fabric_cut || '-';
                    document.getElementById('detail-width').textContent = order.width ? `${order.width} cm` : '-';
                    document.getElementById('detail-height').textContent = order.height ? `${order.height} cm` : '-';
                    document.getElementById('detail-quantity').textContent = order.quantity || '-';
                    document.getElementById('detail-total-length-meters').textContent = order.total_length_meters ? `${order.total_length_meters} m` : '-';
                    document.getElementById('detail-fusing-type').textContent = order.fusing_type || '-';
                    document.getElementById('detail-lamination-type').textContent = order.lamination_type || '-';
                    document.getElementById('detail-cut-type').textContent = order.cut_type || '-';
                    document.getElementById('detail-label-type').textContent = order.label_type || '-';
                    document.getElementById('detail-design-specification').textContent = order.design_specification || '-';
                    document.getElementById('detail-office-notes').textContent = order.office_notes || '-';
                    document.getElementById('detail-factory-notes').textContent = order.factory_notes || '-';
                    document.getElementById('detail-customer-note-to-office').textContent = order.customer_note_to_office || '-';
                    document.getElementById('detail-delivery-date').textContent = order.delivery_date || '-';
                    document.getElementById('detail-exit-from-office-date').textContent = order.exit_from_office_date || '-';
                    document.getElementById('detail-exit-from-factory-date').textContent = order.exit_from_factory_date || '-';
                    document.getElementById('detail-created-at').textContent = order.created_at ? order.created_at.split('T')[0] : '-';
                    document.getElementById('detail-created-by-username').textContent = order.created_by_username || '-';

                    detailModal.show();
                })
                .catch(error => {
                    console.error('Error fetching order details:', error);
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
                    ${data.message || 'Order deleted successfully!'}
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
                    document.getElementById('edit_file_name').value = order.file_name || '';
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
                    
                    // Update form action
                    editForm.action = `/orders/${currentOrderId}`;
                    
                    // Show the modal
                    editModal.show();
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

        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
            // Convert empty strings to null, but keep 0 values
            if (key === 'created_at' && value) {
                // Convert datetime-local input to ISO string
                const date = new Date(value);
                data[key] = date.toISOString();
            } else {
                data[key] = value === '' ? null : value;
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
                        ${data.message || 'Order duplicated successfully!'}
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
        
        switch(status) {
            case 'Completed':
                badgeClass = 'bg-success';
                badgeText = 'Completed';
                statusDisplayText = 'Completed';
                break;
            case 'In Progress':
                badgeClass = 'bg-warning';
                badgeText = 'In Progress';
                statusDisplayText = 'In Progress';
                break;
            case 'Pending':
                badgeClass = 'bg-secondary';
                badgeText = 'Pending';
                statusDisplayText = 'Pending';
                break;
            default:
                badgeClass = 'bg-secondary';
                badgeText = 'All';
                statusDisplayText = 'All Status';
        }
        
        statusBadge.className = `badge rounded-pill ${badgeClass}`;
        statusBadge.textContent = badgeText;
        statusText.textContent = statusDisplayText;
        
        // Update active state in dropdown
        if (statusItems) {
            statusItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.status === status) {
                    item.classList.add('active');
                }
            });
        }
    }
  
    // Enhanced filter function
    function filterRows() {
        if (!rows.length) {
            console.log('No rows found in the table');
            return;
        }

        const searchText = currentSearch.toLowerCase();
        const customerText = customerFilter ? customerFilter.value.toLowerCase() : '';
        const fromDate = dateFromFilter ? dateFromFilter.value : '';
        const toDate = dateToFilter ? dateToFilter.value : '';

        console.log('Filtering with date range:', {
            fromDate,
            toDate,
            fromDateObj: fromDate ? new Date(fromDate).toISOString() : null,
            toDateObj: toDate ? new Date(toDate).toISOString() : null
        });
  
        let visibleCount = 0;
        rows.forEach(row => {
            // Status check
            const badge = row.querySelector('td:nth-child(7) .badge');
            const status = badge ? badge.textContent.trim() : '';
            const statusMatch = currentStatus === 'all' || status === currentStatus;
  
            // Customer name check
            const customerCell = row.querySelector('td:nth-child(2)');
            const customerName = customerCell ? customerCell.textContent.toLowerCase() : '';
            const customerMatch = !customerText || customerName.includes(customerText);
  
            // Date checks - both created and delivery dates
            const createdDateCell = row.querySelector('td:nth-child(8)');
            const deliveryDateCell = row.querySelector('td:nth-child(6)');
            
            // Get created date from title attribute (contains full datetime)
            const createdDate = createdDateCell ? createdDateCell.getAttribute('title') : null;
            // Get delivery date from cell text (contains just the date)
            const deliveryDate = deliveryDateCell ? deliveryDateCell.textContent.trim() : null;
            
            const dateMatch = isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate);
            
            if (!dateMatch) {
                console.log('Row filtered out by date:', {
                    customer: customerName,
                    status: status,
                    createdDate,
                    deliveryDate,
                    fromDate,
                    toDate
                });
            }
  
            // Search text check (across all cells)
            const text = Array.from(row.cells)
                            .map(cell => cell.textContent.trim().toLowerCase())
                            .join(' ');
            const searchMatch = !searchText || text.includes(searchText);
  
            // Show row only if all conditions match
            const shouldShow = statusMatch && customerMatch && dateMatch && searchMatch;
            row.style.display = shouldShow ? '' : 'none';
            
            if (shouldShow) {
                visibleCount++;
                console.log('Row visible:', {
                    customer: customerName,
                    status: status,
                    createdDate,
                    deliveryDate,
                    fromDate,
                    toDate
                });
            }
        });
        
        console.log(`Filtered results: ${visibleCount} rows visible out of ${rows.length} total rows`);
        updateActiveFiltersCount();
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
  
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            console.log('Search input changed:', searchInput.value);
            currentSearch = searchInput.value;
            filterRows();
        });
    }
    
    if (customerFilter) {
        customerFilter.addEventListener('input', () => {
            console.log('Customer filter changed:', customerFilter.value);
            filterRows();
        });
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
});
  
