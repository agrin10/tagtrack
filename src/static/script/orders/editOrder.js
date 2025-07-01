import { showAlert } from '../utils/alert.js';
import { previewEditImage } from './imagePreview.js';

export function initEditOrder() {
    const editModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    const editForm = document.getElementById('editOrderForm');
    let currentOrderId = null;
    let editSelectedImages = [];

    // Handle edit button click
    document.querySelectorAll('.edit-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            currentOrderId = this.getAttribute('data-order-id');
            const editBtn = this;
            editBtn.disabled = true;
            const originalIcon = editBtn.innerHTML;
            editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
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
                    if (!data.order) throw new Error('Order data not found');
                    const order = data.order;
                    document.getElementById('edit-form-number').textContent = `#${order.form_number}`;
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
                    document.getElementById('editOrderForm').dataset.orderId = currentOrderId;
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
                                             onclick="window.previewEditImage('${image.id}', '${image.original_filename}')">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <small class="text-muted text-truncate">${image.original_filename}</small>
                                                <button class="btn btn-sm btn-danger" onclick="window.deleteEditImage(${image.id})">
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
                    editForm.action = `/orders/${currentOrderId}`;
                    editModal.show();
                })
                .catch(error => {
                    showAlert('danger', `Error loading order details: ${error.message}`, document.querySelector('.container-fluid'));
                })
                .finally(() => {
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
        const formFields = Array.from(this.elements).filter(element => 
            element.name && 
            element.name !== 'images' && 
            element.type !== 'file'
        );
        const data = {};
        formFields.forEach(element => {
            if (element.name === 'created_at' && element.value) {
                const date = new Date(element.value);
                data[element.name] = date.toISOString();
            } else {
                data[element.name] = element.value === '' ? null : element.value;
            }
        });
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
            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || 'Failed to update order');
            }
            return responseData;
        })
        .then(data => {
            showAlert('success', 'Order updated successfully!', document.querySelector('.container-fluid'));
            editModal.hide();
            window.location.reload();
        })
        .catch(error => {
            showAlert('danger', `Error updating order: ${error.message}`, document.querySelector('.container-fluid'));
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        });
    });

    // Reset form when modal is closed
    document.getElementById('editOrderModal').addEventListener('hidden.bs.modal', function () {
        currentOrderId = null;
        editForm.reset();
        editSelectedImages = [];
        const editOrderImages = document.getElementById('editOrderImages');
        if (editOrderImages) editOrderImages.value = '';
        const previewContainer = document.getElementById('editImagePreviewContainer');
        if (previewContainer) previewContainer.innerHTML = '';
    });

    // Image selection and preview logic
    const editOrderImages = document.getElementById('editOrderImages');
    if (editOrderImages) {
        editOrderImages.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const previewContainer = document.getElementById('editImagePreviewContainer');
            const orderId = document.getElementById('editOrderForm').dataset.orderId;
            if (!orderId) return;
            files.forEach((file, index) => {
                if (file.size > 10 * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                    return;
                }
                if (!file.type.startsWith('image/')) {
                    alert(`File ${file.name} is not an image.`);
                    return;
                }
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
                                    <button type="button" class="btn btn-sm btn-danger" onclick="window.removeEditImage(${index})">
                                        <i class="fas fa-trash-alt"></i> Remove
                                    </button>
                                    <button type="button" class="btn btn-sm btn-primary" onclick="window.uploadEditImage(${index}, '${orderId}')">
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
        document.getElementById('editOrderImages').value = '';
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
                                <button type="button" class="btn btn-sm btn-danger" onclick="window.removeEditImage(${idx})">
                                    <i class="fas fa-trash-alt"></i> Remove
                                </button>
                                <button type="button" class="btn btn-sm btn-primary" onclick="window.uploadEditImage(${idx}, '${orderId}')">
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

    // Upload image
    window.uploadEditImage = async function(index) {
        const image = editSelectedImages[index];
        if (!image) {
            showAlert('danger', 'No image found. Please try again.', document.querySelector('.container-fluid'));
            return;
        }
        const orderId = document.getElementById('editOrderForm').dataset.orderId;
        if (!orderId) {
            showAlert('danger', 'No order ID found. Please try again.', document.querySelector('.container-fluid'));
            return;
        }
        const formData = new FormData();
        formData.append('file', image);
        try {
            const response = await fetch(`/orders/${orderId}/images`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to upload image');
            showAlert('success', 'Image uploaded successfully', document.querySelector('.container-fluid'));
            // Optionally, refresh the image list or update UI
            editSelectedImages.splice(index, 1);
            window.removeEditImage(index);
        } catch (error) {
            showAlert('danger', error.message || 'Failed to upload image', document.querySelector('.container-fluid'));
        }
    };

    // Delete image
    window.deleteEditImage = function(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) return;
        const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
        if (!imageCard) return;
        const deleteBtn = imageCard.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        fetch(`/orders/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok || data.success === false) throw new Error(data.error || data.message || 'Failed to delete image');
            if (imageCard) imageCard.remove();
            showAlert('success', data.message || 'Image deleted successfully!', document.querySelector('.container-fluid'));
        })
        .catch(error => {
            showAlert('danger', `Error deleting image: ${error.message}`, document.querySelector('.container-fluid'));
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }
        });
    };
} 