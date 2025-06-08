document.addEventListener('DOMContentLoaded', function () {
    const detailModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function () {
            const orderId = this.getAttribute('data-order-id');

            fetch(`/orders/${orderId}`)
                .then(response => response.json())
                .then(data => {
                    const order = data.order;
                    
                    // Update status badge color based on status
                    const statusElement = document.getElementById('detail-status');
                    statusElement.textContent = order.status || '-';
                    statusElement.className = 'badge fs-6 px-3 py-2 ' + 
                        (order.status === 'Completed' ? 'bg-success' : 
                            order.status === 'In Progress' ? 'bg-warning' : 
                            'bg-secondary');

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
            data[key] = value === '' ? null : value;
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
});
