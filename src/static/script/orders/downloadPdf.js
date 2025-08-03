export function initDownloadPdf() {
    // Add event listeners to all download PDF buttons
    document.querySelectorAll('.download-pdf-btn').forEach(button => {
        button.addEventListener('click', handlePdfDownload);
    });
}

async function handlePdfDownload(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const orderId = button.dataset.orderId;
    
    if (!orderId) {
        showAlert('خطا: شناسه سفارش یافت نشد', 'danger');
        return;
    }
    
    // Show loading state
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال دانلود...';
    button.disabled = true;
    
    try {
        // Make request to download PDF
        const response = await fetch(`/orders/${orderId}/download-pdf`, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf',
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'خطا در دانلود PDF');
        }
        
        // Get filename from response headers or generate one
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `سفارش_${orderId}.pdf`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('PDF با موفقیت دانلود شد', 'success');
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showAlert(`خطا در دانلود PDF: ${error.message}`, 'danger');
    } finally {
        // Restore button state
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

// Helper function to show alerts (you can import this from your utils)
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="بستن"></button>
    `;
    
    // Find alert container or create one
    let alertContainer = document.getElementById('alertPlaceholder');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertPlaceholder';
        document.querySelector('.container-fluid').insertBefore(alertContainer, document.querySelector('.container-fluid').firstChild);
    }
    
    // Add alert to container
    alertContainer.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
} 