export function initOrderDetails() {
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
}