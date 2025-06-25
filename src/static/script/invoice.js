document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const table = document.getElementById('invoiceTable');
    let currentSearch = '';

    function filterTable() {
        if (!table) return;
        const searchText = currentSearch.toLowerCase();
        const tbody = table.getElementsByTagName('tbody')[0];
        if (!tbody) return;

        const rows = tbody.getElementsByTagName('tr');
        let hasResults = false;

        for (let row of rows) {
            let shouldShow = false;
            const cells = row.getElementsByTagName('td');
            
            for (let cell of cells) {
                const text = (cell.textContent || cell.innerText).toLowerCase().trim();
                if (text.includes(searchText)) {
                    shouldShow = true;
                    hasResults = true;
                    break;
                }
            }
            row.style.display = shouldShow ? '' : 'none';
        }

        // Show/hide no results message
        let noResultsMsg = document.getElementById('noResultsMessage');
        if (!hasResults && searchText) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'noResultsMessage';
                noResultsMsg.className = 'alert alert-info text-center mt-3';
                noResultsMsg.innerHTML = 'هیچ فاکتوری یافت نشد';
                table.parentNode.insertBefore(noResultsMsg, table.nextSibling);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    // Search input event handler
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            filterTable();
        });
    }

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