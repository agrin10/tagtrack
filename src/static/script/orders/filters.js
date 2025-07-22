export function initFilters() {
    const statusItems = document.querySelectorAll('.filter-status');
    const statusBtn = document.getElementById('statusFilterDropdown');
    const statusText = document.getElementById('statusFilterText');
    const statusBadge = document.getElementById('statusFilterBadge');
    const searchInput = document.getElementById('searchInput');
    const rows = Array.from(document.querySelectorAll('#ordersTable tbody tr'));
    const customerFilter = document.getElementById('customerFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const activeFiltersBadge = document.getElementById('activeFiltersBadge');
    const filterCollapse = document.getElementById('filterCollapse');
    const sketchFilter = document.getElementById('sketchFilter');
    let currentStatus = 'all';
    let currentSearch = '';
    let activeFilters = 0;
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search');
    const initialStatus = urlParams.get('status');
    if (searchInput && initialSearch) {
        searchInput.value = initialSearch;
        currentSearch = initialSearch;
    }
    if (statusBtn && initialStatus) {
        const selectedStatusLink = document.querySelector(`.filter-status[data-status="${initialStatus}"]`);
        if (selectedStatusLink) {
            currentStatus = initialStatus;
            updateFilterButton(currentStatus);
        }
    }
    function updateActiveFiltersCount() {
        let count = 0;
        if (currentStatus !== 'all') count++;
        if (currentSearch) count++;
        if (customerFilter && customerFilter.value) count++;
        if ((dateFromFilter && dateFromFilter.value) || (dateToFilter && dateToFilter.value)) count++;
        if (sketchFilter && !sketchFilter.disabled && sketchFilter.value) count++;
        if (activeFiltersBadge) {
            activeFilters = count;
            activeFiltersBadge.textContent = count;
            activeFiltersBadge.className = `badge rounded-pill ${count > 0 ? 'bg-primary' : 'bg-secondary'}`;
        }
    }
    function clearAllFilters() {
        currentStatus = 'all';
        currentSearch = '';
        if (customerFilter) customerFilter.value = '';
        if (sketchFilter) {
            sketchFilter.value = '';
            sketchFilter.disabled = true;
        }
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';
        if (searchInput) searchInput.value = '';
        updateFilterButton('all');
        updateActiveFiltersCount();
        filterRows();
    }
    function isDateInRange(dateStr, fromDate, toDate) {
        if (!dateStr) return false;
        try {
            let orderDate;
            if (dateStr.includes('T')) {
                orderDate = new Date(dateStr);
            } else {
                const [year, month, day] = dateStr.split('-').map(Number);
                orderDate = new Date(year, month - 1, day);
            }
            if (!fromDate && !toDate) return true;
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            if (!dateStr.includes('T')) orderDate.setHours(0, 0, 0, 0);
            if (from && orderDate < from) return false;
            if (to && orderDate > to) return false;
            return true;
        } catch (error) {
            return false;
        }
    }
    function isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate) {
        const createdInRange = createdDate ? isDateInRange(createdDate, fromDate, toDate) : false;
        const deliveryInRange = deliveryDate ? isDateInRange(deliveryDate, fromDate, toDate) : false;
        return createdInRange || deliveryInRange;
    }
    function updateFilterButton(status) {
        if (!statusBadge || !statusText) return;
        let badgeClass, badgeText, statusDisplayText;
        switch(status.toLowerCase()) {
            case 'completed': badgeClass = 'bg-success'; badgeText = 'تکمیل شده'; statusDisplayText = 'تکمیل شده'; break;
            case 'in progress': badgeClass = 'bg-warning'; badgeText = 'در حال انجام'; statusDisplayText = 'در حال انجام'; break;
            case 'pending': badgeClass = 'bg-secondary'; badgeText = 'در انتظار'; statusDisplayText = 'در انتظار'; break;
            default: badgeClass = 'bg-secondary'; badgeText = 'همه'; statusDisplayText = 'همه وضعیت‌ها';
        }
        statusBadge.className = `badge rounded-pill ${badgeClass}`;
        statusBadge.textContent = badgeText;
        statusText.textContent = statusDisplayText;
        if (statusItems) {
            statusItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.status.toLowerCase() === status.toLowerCase()) {
                    item.classList.add('active');
                }
            });
        }
    }
    function mapStatusToPersian(statusKey) {
        const mapping = {
            'completed': 'تکمیل شده',
            'in progress': 'در حال انجام',
            'pending': 'در انتظار',
            'all': 'all'
        };
        return mapping[statusKey.toLowerCase()] || statusKey;
    }
    function filterRows() {
        if (!rows.length) return;
        const searchText = currentSearch.toLowerCase();
        const customerText = customerFilter ? customerFilter.value.toLowerCase() : '';
        const sketchText = (sketchFilter && !sketchFilter.disabled) ? sketchFilter.value.toLowerCase() : '';
        const fromDate = dateFromFilter ? dateFromFilter.value : '';
        const toDate = dateToFilter ? dateToFilter.value : '';
        let visibleCount = 0;
        rows.forEach(row => {
            const badge = row.querySelector('td:nth-child(8) .badge');
            const status = badge ? badge.textContent.trim().toLowerCase() : '';
            const mappedStatus = mapStatusToPersian(currentStatus);
            const statusMatch = mappedStatus === 'all' || status === mappedStatus;
            const customerCell = row.querySelector('td:nth-child(4)');
            const customerName = customerCell ? customerCell.textContent.toLowerCase() : '';
            const customerMatch = !customerText || customerName.includes(customerText);
            const createdDateCell = row.querySelector('td:nth-child(2)');
            const deliveryDateCell = row.querySelector('td:nth-child(9)');
            const createdDate = createdDateCell ? createdDateCell.getAttribute('title') : null;
            const deliveryDate = deliveryDateCell ? deliveryDateCell.textContent.trim() : null;
            const dateMatch = isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate);
            const text = Array.from(row.cells).map(cell => cell.textContent.trim().toLowerCase()).join(' ');
            const searchMatch = !searchText || text.includes(searchText);
            const sketchCell = row.querySelector('td:nth-child(3)');
            const sketchName = sketchCell ? sketchCell.textContent.toLowerCase() : '';
            const sketchMatch = !sketchText || sketchName.includes(sketchText);
            const shouldShow = statusMatch && customerMatch && dateMatch && searchMatch && sketchMatch;
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
        updateActiveFiltersCount();
    }
    if (statusItems) {
        statusItems.forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                currentStatus = item.dataset.status;
                updateFilterButton(currentStatus);
                filterRows();
            });
        });
    }
    if (customerFilter) {
        customerFilter.addEventListener('input', () => {
            if (customerFilter.value.trim()) {
                sketchFilter.disabled = false;
            } else {
                sketchFilter.value = '';
                sketchFilter.disabled = true;
            }
            filterRows();
        });
    }
    if (sketchFilter) {
        sketchFilter.addEventListener('input', filterRows);
    }
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', () => { filterRows(); });
    }
    if (dateToFilter) {
        dateToFilter.addEventListener('change', () => { filterRows(); });
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => { clearAllFilters(); });
    }
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (searchInput) currentSearch = searchInput.value;
            filterRows();
            if (window.innerWidth < 768 && filterCollapse) {
                const bsCollapse = new bootstrap.Collapse(filterCollapse);
                bsCollapse.hide();
            }
        });
    }
    updateFilterButton('all');
    updateActiveFiltersCount();
    filterRows();
} 