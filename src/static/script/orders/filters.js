export function initFilters() {
    const statusItems = document.querySelectorAll('.filter-status');
    const statusBtn = document.getElementById('statusFilterDropdown');
    const statusText = document.getElementById('statusFilterText');
    const statusBadge = document.getElementById('statusFilterBadge');
    const searchInput = document.getElementById('searchInput');
    // convert NodeList to array so we can map/cache easily
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
    // parse initial URL params (search / status)
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

    // ---------------- utilities ----------------
    function persianDigitsToEnglish(str) {
        if (!str) return str;
        const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
        const arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        let out = String(str);
        for (let i = 0; i < 10; i++) {
            out = out.replace(new RegExp(persian[i], 'g'), String(i));
            out = out.replace(new RegExp(arabic[i], 'g'), String(i));
        }
        // remove zero-width & BOM
        out = out.replace(/[\u200C\u200B\uFEFF]/g, '');
        return out;
    }

    /**
     * Extract first date-like token from input and return JS Date or null.
     * - tokens with "/" are treated as Jalali (converted with jalaliToGregorian)
     * - tokens with "-" are treated as Gregorian (YYYY-MM-DD)
     */
    function parseDateFlexible(s) {
        if (!s) return null;
        const raw = String(s).trim();
        // Accept Latin digits, Persian (U+06F0–U+06F9) and Arabic-Indic (U+0660–U+0669)
        const digitClass = '0-9\u06F0-\u06F9\u0660-\u0669';
        const dateRegex = new RegExp('[' + digitClass + ']{3,4}[\\/\\-][' + digitClass + ']{1,2}[\\/\\-][' + digitClass + ']{1,2}');
        const m = raw.match(dateRegex);
        if (!m) return null;

        let token = m[0];
        token = persianDigitsToEnglish(token);

        if (token.includes('/')) {
            const parts = token.split('/');
            if (parts.length !== 3) return null;
            const jy = parseInt(parts[0], 10);
            const jm = parseInt(parts[1], 10);
            const jd = parseInt(parts[2], 10);
            if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return null;
            // use global jalaliToGregorian (from app.js)
            const g = typeof jalaliToGregorian === 'function' ? jalaliToGregorian(jy, jm, jd) : null;
            if (!g || !Number.isFinite(g.gy)) return null;
            return new Date(g.gy, g.gm - 1, g.gd);
        } else if (token.includes('-')) {
            const parts = token.split('-');
            if (parts.length !== 3) return null;
            const gy = parseInt(parts[0], 10);
            const gm = parseInt(parts[1], 10);
            const gd = parseInt(parts[2], 10);
            if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return null;
            return new Date(gy, gm - 1, gd);
        }
        return null;
    }

    function startOfDay(d) {
        if (!(d instanceof Date) || isNaN(d)) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
    function endOfDay(d) {
        if (!(d instanceof Date) || isNaN(d)) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    // Get a clean date string from a table cell:
    // prefer title attribute (if present), otherwise visible text.
    function getDateStringFromCell(cell) {
        if (!cell) return null;
        const t = cell.getAttribute('title');
        if (t && t.trim() && t.trim() !== '-') return t.trim();
        const visible = cell.textContent.trim();
        return (visible && visible !== '-') ? visible : null;
    }

    // Cache parsed dates for each row to avoid re-parsing every filter run
    // We'll store ISO timestamps in data attributes: data-parsed-created, data-parsed-delivery
    function cacheRowDates(row) {
        if (!row) return;
        // if cached already, keep it
        if (row.dataset.parsedCreated !== undefined && row.dataset.parsedDelivery !== undefined) return;

        const createdDateCell = row.querySelector('td:nth-child(2)');
        const deliveryDateCell = row.querySelector('td:nth-child(9)');

        const createdStr = getDateStringFromCell(createdDateCell);
        const deliveryStr = getDateStringFromCell(deliveryDateCell);

        const createdDate = createdStr ? parseDateFlexible(createdStr) : null;
        const deliveryDate = deliveryStr ? parseDateFlexible(deliveryStr) : null;

        row.dataset.parsedCreated = createdDate ? createdDate.toISOString() : '';
        row.dataset.parsedDelivery = deliveryDate ? deliveryDate.toISOString() : '';
    }

    // Pre-cache all rows once (fast) — optional but helps repeated filtering
    rows.forEach(cacheRowDates);

    // ---------------- filter helpers ----------------

    function isDateInRange(dateStr, fromDate, toDate) {
        // If no filter is set, show all
        if (!fromDate && !toDate) return true;
        if (!dateStr || dateStr === '-') return false;

        const orderDate = parseDateFlexible(dateStr);
        if (!orderDate) return false;

        const from = fromDate ? parseDateFlexible(fromDate) : null;
        const to = toDate ? parseDateFlexible(toDate) : null;

        // if user provided a filter value but it fails to parse, be conservative
        if ((fromDate && !from) || (toDate && !to)) return false;

        if (from && orderDate < startOfDay(from)) return false;
        if (to && orderDate > endOfDay(to)) return false;
        return true;
    }

    function isEitherDateInRange(createdDate, deliveryDate, fromDate, toDate) {
        // If no filter is set, show all
        if (!fromDate && !toDate) return true;

        const createdInRange = createdDate ? isDateInRange(createdDate, fromDate, toDate) : false;
        const deliveryInRange = deliveryDate ? isDateInRange(deliveryDate, fromDate, toDate) : false;
        return createdInRange || deliveryInRange;
    }

    // ---------------- UI helpers ----------------

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
    function updateFilterButton(status) {
        if (!statusBadge || !statusText) return;
        let badgeClass, badgeText, statusDisplayText;
        switch(status.toLowerCase()) {
            case 'completed': badgeClass = 'bg-success'; badgeText = 'تکمیل شده'; statusDisplayText = 'تکمیل شده'; break;
            case 'in progress': badgeClass = 'bg-warning'; badgeText = 'در حال تولید'; statusDisplayText = 'در حال تولید'; break;
            case 'pending': badgeClass = 'bg-secondary'; badgeText = 'سفارش'; statusDisplayText = 'سفارش'; break;
            case 'design': badgeClass = 'bg-secondary'; badgeText = 'طراحی'; statusDisplayText = 'طراحی'; break;
            default: badgeClass = 'bg-secondary'; badgeText = 'همه'; statusDisplayText = 'همه وضعیت‌ها';
        }
        if (statusBadge) {
            statusBadge.className = `badge rounded-pill ${badgeClass}`;
            statusBadge.textContent = badgeText;
        }
        if (statusText) {
            statusText.textContent = statusDisplayText;
        }
        if (statusItems) {
            statusItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.status && item.dataset.status.toLowerCase() === status.toLowerCase()) {
                    item.classList.add('active');
                }
            });
        }
    }

    function mapStatusToPersian(statusKey) {
        const mapping = {
            'completed': 'تکمیل شده',
            'in progress': 'در حال تولید',
            'pending': 'سفارش',
            'design': 'طراحی',
            'all': 'all'
        };
        return mapping[statusKey.toLowerCase()] || statusKey;
    }

    // ---------------- main filter logic ----------------

    function filterRows() {
        if (!rows.length) return;
        const searchText = currentSearch.toLowerCase();
        const customerText = customerFilter ? customerFilter.value.toLowerCase() : '';
        const sketchText = (sketchFilter && !sketchFilter.disabled) ? sketchFilter.value.toLowerCase() : '';
        const fromDate = dateFromFilter ? dateFromFilter.value : '';
        const toDate = dateToFilter ? dateToFilter.value : '';
        let visibleCount = 0;

        rows.forEach(row => {
            // ensure date cache exists (for rows added dynamically later)
            cacheRowDates(row);

            // status cell: your original code used nth-child(8), keep same
            const badge = row.querySelector('td:nth-child(8) .badge');
            const status = badge ? badge.textContent.trim().toLowerCase() : '';
            const mappedStatus = mapStatusToPersian(currentStatus);
            const statusMatch = mappedStatus === 'all' || status === mappedStatus;

            const customerCell = row.querySelector('td:nth-child(4)');
            const customerName = customerCell ? customerCell.textContent.toLowerCase() : '';
            const customerMatch = !customerText || customerName.includes(customerText);

            // use cached parsed strings if available
            let createdDateIso = row.dataset.parsedCreated || '';
            let deliveryDateIso = row.dataset.parsedDelivery || '';

            // if cache exists as ISO, convert to readable form for parsing function (parseDateFlexible accepts display strings)
            // But parseDateFlexible can also handle ISO-like strings (YYYY-MM-DD)
            const createdDate = createdDateIso ? new Date(createdDateIso) : null;
            const deliveryDate = deliveryDateIso ? new Date(deliveryDateIso) : null;

            // For date comparisons, prefer using the original cell strings (to support Jalali tokens like "1404/05/18 شنبه")
            const createdDateCell = row.querySelector('td:nth-child(2)');
            const deliveryDateCell = row.querySelector('td:nth-child(9)');
            const createdDateStr = getDateStringFromCell(createdDateCell) || (createdDate ? createdDate.toISOString().split('T')[0] : null);
            const deliveryDateStr = getDateStringFromCell(deliveryDateCell) || (deliveryDate ? deliveryDate.toISOString().split('T')[0] : null);

            const dateMatch = isEitherDateInRange(createdDateStr, deliveryDateStr, fromDate, toDate);

            // full-text search across row cells
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

    // ---------------- event wiring ----------------

    if (statusItems) {
        statusItems.forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                if (!item.dataset.status) return;
                currentStatus = item.dataset.status;
                updateFilterButton(currentStatus);
                filterRows();
            });
        });
    }

    if (customerFilter) {
        customerFilter.addEventListener('input', () => {
            if (customerFilter.value.trim()) {
                if (sketchFilter) sketchFilter.disabled = false;
            } else {
                if (sketchFilter) {
                    sketchFilter.value = '';
                    sketchFilter.disabled = true;
                }
            }
            filterRows();
        });
    }

    if (sketchFilter) sketchFilter.addEventListener('input', filterRows);
    if (dateFromFilter) dateFromFilter.addEventListener('input', filterRows);
    if (dateToFilter) dateToFilter.addEventListener('input', filterRows);

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

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value;
            filterRows();
        });
    }

    // initial state
    updateFilterButton('all');
    updateActiveFiltersCount();
    filterRows();

    // return an object so callers can trigger filterRows() or clearAllFilters() if they like
    return {
        filterRows,
        clearAllFilters
    };
}
