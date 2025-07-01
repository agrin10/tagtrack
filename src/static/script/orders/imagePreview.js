// imagePreview.js
export function previewDetailImage(imageId, filename) {
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
        previewModal.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = bootstrap.Modal.getInstance(previewModal);
                if (modal) modal.hide();
            }
        });
    } else {
        previewModal.querySelector('.modal-title').innerHTML = `<i class="fas fa-image me-2"></i>${filename}`;
        const img = previewModal.querySelector('img');
        const spinner = document.getElementById('detailPreviewImageSpinner');
        if (spinner) spinner.style.display = 'block';
        img.src = `/orders/images/${imageId}`;
        img.alt = filename;
        const downloadBtn = previewModal.querySelector('a[download]');
        if (downloadBtn) {
            downloadBtn.href = `/orders/images/${imageId}`;
            downloadBtn.download = filename;
        }
    }
    const modal = new bootstrap.Modal(previewModal, { backdrop: false, keyboard: true });
    modal.show();
    previewModal.addEventListener('hidden.bs.modal', function () {
        const img = previewModal.querySelector('img');
        if (img) img.src = '';
    }, { once: true });
}

export function previewEditImage(imageId, filename) {
    // Optionally, you can use the same modal logic as previewDetailImage, or create a separate modal for edit images.
    previewDetailImage(imageId, filename);
} 