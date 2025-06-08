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
                    
                    statusElement.className = `badge fs-6 px-4 py-2 mb-2 ${statusClass}`;
                    statusElement.innerHTML = `${statusIcon}${order.status || '-'}`;
                    
                    progressBar.className = `progress-bar ${statusClass}`;
                    progressBar.style.width = progressWidth;
                    
                    // Add a subtle animation to the progress bar
                    progressBar.style.transition = 'width 0.6s ease-in-out';

                    document.getElementById('detail-form-number').textContent = `#${order.form_number}`;
                    document.getElementById('detail-customer-name').textContent = order.customer_name || '-';
                    document.getElementById('detail-fabric-name').textContent = order.fabric_name || '-';
                    document.getElementById('detail-fabric-code').textContent = order.fabric_code || '-';
                    document.getElementById('detail-width').textContent = order.width ? `${order.width} cm` : '-';
                    document.getElementById('detail-height').textContent = order.height ? `${order.height} cm` : '-';
                    document.getElementById('detail-quantity').textContent = order.quantity || '-';
                    document.getElementById('detail-total-length-meters').textContent = order.total_length_meters ? `${order.total_length_meters} m` : '-';
                    document.getElementById('detail-print-type').textContent = order.print_type || '-';
                    document.getElementById('detail-lamination-type').textContent = order.lamination_type || '-';
                    document.getElementById('detail-cut-type').textContent = order.cut_type || '-';
                    document.getElementById('detail-label-type').textContent = order.label_type || '-';
                    document.getElementById('detail-design-specification').textContent = order.design_specification || '-';
                    document.getElementById('detail-office-notes').textContent = order.office_notes || '-';
                    document.getElementById('detail-factory-notes').textContent = order.factory_notes || '-';
                    document.getElementById('detail-delivery-date').textContent = order.delivery_date || '-';
                    document.getElementById('detail-created-at').textContent = order.created_at ? order.created_at.split('T')[0] : '-';
                    document.getElementById('detail-created-by-username').textContent = order.created_by_username || '-';


                    detailModal.show();
                })
                .catch(error => {
                    console.error('❌ Error fetching order details:', error);
                    alert('Error loading order details. Please try again.');
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
            
            // Fetch order details
            fetch(`/orders/${currentOrderId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.order) {
                        const order = data.order;
                        
                        // Update modal title
                        document.getElementById('edit-form-number').textContent = `#${order.form_number}`;
                        
                        // Populate form fields
                        document.getElementById('edit_form_number').value = order.form_number || '';
                        document.getElementById('edit_customer_name').value = order.customer_name || '';
                        document.getElementById('edit_fabric_name').value = order.fabric_name || '';
                        document.getElementById('edit_fabric_code').value = order.fabric_code || '';
                        document.getElementById('edit_width').value = order.width || '';
                        document.getElementById('edit_height').value = order.height || '';
                        document.getElementById('edit_quantity').value = order.quantity || '';
                        document.getElementById('edit_total_length_meters').value = order.total_length_meters || '';
                        document.getElementById('edit_print_type').value = order.print_type || '';
                        document.getElementById('edit_lamination_type').value = order.lamination_type || '';
                        document.getElementById('edit_cut_type').value = order.cut_type || '';
                        document.getElementById('edit_label_type').value = order.label_type || '';
                        document.getElementById('edit_delivery_date').value = order.delivery_date || '';
                        document.getElementById('edit_status').value = order.status || 'Pending';
                        document.getElementById('edit_design_specification').value = order.design_specification || '';
                        document.getElementById('edit_office_notes').value = order.office_notes || '';
                        document.getElementById('edit_factory_notes').value = order.factory_notes || '';
                        
                        // Format and set created_at datetime
                        if (order.created_at) {
                            // Convert ISO string to datetime-local input format (YYYY-MM-DDThh:mm)
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
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading order details. Please try again.');
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
            if (confirm('Are you sure you want to duplicate this order?')) {
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
                        alert(data.message || 'Order duplicated successfully!');
                        window.location.reload(); // Reload to see the new order
                    } else {
                        throw new Error(data.error || 'Failed to duplicate order');
                    }
                })
                .catch(error => {
                    console.error('Error duplicating order:', error);
                    alert(`Error duplicating order: ${error.message || 'An unknown error occurred.'}`);
                });
            }
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


    // Function to get current URL parameters
    function getUrlParams() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        return params;
    }

    // Function to update URL parameters and reload
    function updateUrlAndReload(newParams) {
        const currentParams = getUrlParams();
        const updatedParams = { ...currentParams, ...newParams };

        // Remove empty or 'all' status parameters
        for (const key in updatedParams) {
            if (updatedParams[key] === '' || updatedParams[key] === 'all') {
                delete updatedParams[key];
            }
        }

        const queryString = new URLSearchParams(updatedParams).toString();
        window.location.href = `${window.location.pathname}?${queryString}`;
    }

    // Initialize search input from URL
    const searchInput = document.getElementById('searchInput');
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search');
    if (searchInput && initialSearch) {
        searchInput.value = initialSearch;
    }

    // Initialize status dropdown from URL
    const statusFilterDropdown = document.getElementById('statusFilterDropdown');
    const initialStatus = urlParams.get('status');
    if (statusFilterDropdown) {
        const statusText = document.querySelector(`#statusFilterDropdown`);
        const selectedStatusLink = document.querySelector(`.filter-status[data-status="${initialStatus || 'all'}"]`);
        if (selectedStatusLink) {
            statusText.textContent = selectedStatusLink.textContent;
            statusFilterDropdown.setAttribute('data-current-status', initialStatus || 'all');
        }
    }

    // Debounce for search input
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                updateUrlAndReload({ search: this.value, page: 1 });
            }, 500);
        });
    }

    // Status filter clicks
    document.querySelectorAll('.filter-status').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const status = this.getAttribute('data-status');
            updateUrlAndReload({ status: status, page: 1 });
        });
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const statusItems = document.querySelectorAll('.filter-status');
    const statusBtn = document.getElementById('statusFilterDropdown');
    const statusText = document.getElementById('statusFilterText');
    const statusBadge = document.getElementById('statusFilterBadge');
    const searchInput = document.getElementById('searchInput');
    const rows = Array.from(document.querySelectorAll('#ordersTable tbody tr'));
  
    let currentStatus = 'all';
    let currentSearch = '';
  
    // Function to update filter button appearance
    function updateFilterButton(status) {
        let badgeClass, badgeText, statusText;
        
        switch(status) {
            case 'Completed':
                badgeClass = 'bg-success';
                badgeText = 'Completed';
                statusText = 'Completed';
                break;
            case 'In Progress':
                badgeClass = 'bg-warning';
                badgeText = 'In Progress';
                statusText = 'In Progress';
                break;
            case 'Pending':
                badgeClass = 'bg-secondary';
                badgeText = 'Pending';
                statusText = 'Pending';
                break;
            default:
                badgeClass = 'bg-secondary';
                badgeText = 'All';
                statusText = 'All Status';
        }
        
        statusBadge.className = `badge rounded-pill ${badgeClass}`;
        statusBadge.textContent = badgeText;
        statusText.textContent = statusText;
        
        // Update active state in dropdown
        statusItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.status === status) {
                item.classList.add('active');
            }
        });
    }
  
    // main filter function
    function filterRows() {
        const s = currentSearch.toLowerCase();
  
        rows.forEach(row => {
            // — status check —
            const badge = row.querySelector('td:nth-child(7) .badge');
            const status = badge ? badge.textContent.trim() : '';
            const statusMatch = currentStatus === 'all' || status === currentStatus;
  
            // — search check —
            const text = Array.from(row.cells)
                            .map(cell => cell.textContent.trim().toLowerCase())
                            .join(' ');
            const searchMatch = text.includes(s);
  
            // show only if both match
            row.style.display = (statusMatch && searchMatch) ? '' : 'none';
        });
    }
  
    // wire up status dropdown
    statusItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            currentStatus = item.dataset.status;
            updateFilterButton(currentStatus);
            filterRows();
        });
    });
  
    // wire up search box
    searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value;
        filterRows();
    });
    
    // Initialize filter button
    updateFilterButton('all');
});
  
