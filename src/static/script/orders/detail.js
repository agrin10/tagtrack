export function initOrderDetails() {
    const detailModalEl = document.getElementById('orderDetailsModal');
    if (!detailModalEl) {
        console.error('Order details modal not found!');
        return;
    }
    const detailModal = new bootstrap.Modal(detailModalEl);

    // Helper to safely set text content
    function setTextContent(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '-';
    }

    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const orderId = btn.getAttribute('data-order-id');
            if (!orderId) return;

            // Show loading state
            const modalBody = detailModalEl.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">در حال بارگذاری جزئیات سفارش...</p>
                    </div>
                `;
            }
            detailModal.show();

            fetch(`/orders/${orderId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch order details');
                    return res.json();
                })
                .then(data => {
                    const order = data.order;
                    if (!order) throw new Error('Order data not found');

                    // Populate modal fields
                    setTextContent('detail-form-number', order.form_number);
                    setTextContent('detail-customer-name', order.customer_name);
                    setTextContent('detail-sketch-name', order.sketch_name);
                    setTextContent('detail-fabric-density', order.fabric_density);
                    setTextContent('detail-fabric-code', order.fabric_cut);
                    setTextContent('detail-width', order.width ? `${order.width} cm` : null);
                    setTextContent('detail-height', order.height ? `${order.height} cm` : null);
                    setTextContent('detail-quantity', order.quantity);
                    setTextContent('detail-total-length-meters', order.total_length_meters ? `${order.total_length_meters} m` : null);
                    setTextContent('detail-lamination-type', order.lamination_type);
                    setTextContent('detail-cut-type', order.cut_type);
                    setTextContent('detail-label-type', order.label_type);
                    setTextContent('detail-design-specification', order.design_specification);
                    setTextContent('detail-office-notes', order.office_notes);
                    setTextContent('detail-factory-notes', order.factory_notes);
                    setTextContent('detail-customer-note-to-office', order.customer_note_to_office);
                    setTextContent('detail-delivery-date', convertToJalali(order.delivery_date));
                    setTextContent('detail-exit-from-office-date', convertToJalali(order.exit_from_office_date));
                    setTextContent('detail-exit-from-factory-date', convertToJalali(order.exit_from_factory_date));
                    setTextContent('detail-created-at', order.created_at ? convertToJalali(order.created_at.split('T')[0]) : null);
                    setTextContent('detail-created-by-username', order.created_by_username);

                    // Status badge and progress bar
                    const statusBadge = document.getElementById('detail-status');
                    const progressBar = document.getElementById('detail-status-progress');
                    let statusClass = 'bg-secondary', progress = 0, statusText = order.status || '-';
                    switch (order.status) {
                        case 'Pending': statusClass = 'bg-warning'; progress = 25; break;
                        case 'In Progress': statusClass = 'bg-info'; progress = 50; break;
                        case 'In Factory': statusClass = 'bg-primary'; progress = 75; break;
                        case 'Completed': statusClass = 'bg-success'; progress = 100; break;
                    }
                    if (statusBadge) {
                        statusBadge.className = `badge fs-6 px-4 py-2 mb-2 ${statusClass}`;
                        statusBadge.textContent = statusText;
                    }
                    if (progressBar) {
                        progressBar.className = `progress-bar ${statusClass}`;
                        progressBar.style.width = `${progress}%`;
                    }

                    // Images
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
                })
                .catch(error => {
                    if (modalBody) {
                        modalBody.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                خطا در بارگذاری جزئیات سفارش: ${error.message}
                            </div>
                        `;
                    }
                });
        });
    });
}