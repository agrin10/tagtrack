// exportExcel.js
export function initExportExcel() {
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            const statusFilterDropdown = document.getElementById('statusFilterDropdown');
            const currentSearch = searchInput ? searchInput.value : '';
            const currentStatus = statusFilterDropdown ? statusFilterDropdown.getAttribute('data-current-status') || 'all' : 'all';
            let exportUrl = `/orders/export/excel?`;
            const params = [];
            if (currentSearch) params.push(`search=${encodeURIComponent(currentSearch)}`);
            if (currentStatus && currentStatus !== 'all') params.push(`status=${encodeURIComponent(currentStatus)}`);
            exportUrl += params.join('&');
            window.location.href = exportUrl;
        });
    }
} 