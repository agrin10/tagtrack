document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const table = document.getElementById('invoiceTable');
    let currentSearch = '';
    setupTableSearch('#searchInput', '#invoiceTable tbody tr');

    // Clear search button event handler
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                currentSearch = '';
                filterTable();
                searchInput.focus();
            }
        });
    }
}); 