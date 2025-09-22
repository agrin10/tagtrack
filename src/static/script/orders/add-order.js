// order-form.js
// Unified and cleaned version of your add-order modal logic.
// Exports initAddOrder() and also auto-initializes on DOMContentLoaded.

export function initAddOrder() {
    // --- state ---
    let serverNextFormNumber = null; // last preview fetched from server

    // --- helper DOM refs ---
    const addFileRowBtn = document.getElementById('addFileRowBtn');
    const filesTableBody = document.getElementById('filesTableBody');
    const nextTabBtn = document.getElementById('nextTab');
    const prevTabBtn = document.getElementById('prevTab');
    const tabButtons = document.querySelectorAll('#orderFormTabs .nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const progressBar = document.getElementById('formProgress');
    const formNumberInput = document.getElementById('form_number');
    const startFormInput = document.getElementById('start_form_number');
    const startFormWarning = document.getElementById('startFormWarning');
    const startFormNote = document.getElementById('startFormNote');
    const createOrderModalSelector = '#createOrderModal';
    const createOrderFormSelector = '#createOrderForm';
    const createdAtEl = document.getElementById('created_at');
    const createOrderForm = document.querySelector('#createOrderForm');

    // --- permissions ---
    async function fetchPermissions() {
        try {
            const res = await fetch('/orders/permissions', { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn('permissions fetch failed', e);
            return null;
        }
    }

    function markReadonly(el) {
        if (!el) return;
        const tag = el.tagName.toLowerCase();
        // Use disabled for form fields that shouldn't be submitted
        if (tag === 'select' || tag === 'input' || tag === 'textarea') {
            el.disabled = true;
        }
        el.classList.add('bg-light');
        el.setAttribute('title', 'You do not have permission to edit this field');
    }

    function applyPermissionsToAddForm(perms) {
        if (!createOrderForm || !perms) return;
        const editable = perms.editable_fields;
        const all = editable === 'ALL';

        // Scalar fields: disable those not in editable when not ALL
        if (!all) {
            const inputs = createOrderForm.querySelectorAll('input[name]:not([name$="[]"]), select[name]:not([name$="[]"]), textarea[name]:not([name$="[]"])');
            inputs.forEach(el => {
                const name = el.getAttribute('name');
                if (!editable.includes(name)) {
                    markReadonly(el);
                }
            });
        }

        // Specials
        // values[] (coloring)
        if (!perms.specials.values) {
            createOrderForm.querySelectorAll('input[name="values[]"]').forEach(el => markReadonly(el));
        }
        // files
        if (!perms.specials.files) {
            if (addFileRowBtn) addFileRowBtn.style.display = 'none';
            createOrderForm.querySelectorAll('input[name="order_files[]"], input[name="file_display_names[]"]').forEach(el => markReadonly(el));
        }
        // images: hide any add-image controls if present
        if (!perms.specials.images) {
            const imageInputs = createOrderForm.querySelectorAll('input[type="file"][name="orderImages"], input[type="file"][id*="OrderImages"]');
            imageInputs.forEach(el => { el.disabled = true; el.style.display = 'none'; });
            const imageButtons = createOrderForm.querySelectorAll('[data-role="add-image"], .add-image-btn');
            imageButtons.forEach(btn => btn.style.display = 'none');
        }
    }

    // --- small safe utilities ---
    function safeNumber(v) {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function setPreviewNumber(n) {
        if (!formNumberInput) return;
        // If n is null/undefined use '...' for clarity
        formNumberInput.value = (n === null || n === undefined) ? '...' : String(n);
    }

    // --- add file row ---
    if (addFileRowBtn && filesTableBody) {
        addFileRowBtn.addEventListener('click', function () {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" name="file_display_names[]"></td>
                <td><input type="text" class="form-control form-control-sm" name="order_files[]"></td>
            `;
            filesTableBody.appendChild(newRow);
        });
    }

    // --- tabs / progress ---
    let currentTabIndex = 0;
    function updateProgress() {
        if (!progressBar || tabButtons.length === 0) return;
        const progress = ((currentTabIndex + 1) / tabButtons.length) * 100;
        progressBar.style.width = progress + '%';
    }
    function showTab(index) {
        if (!tabPanes || !tabButtons) return;
        tabPanes.forEach(pane => pane.classList.remove('show', 'active'));
        tabButtons.forEach(btn => btn.classList.remove('active'));
        if (index >= 0 && index < tabButtons.length) {
            tabPanes[index].classList.add('show', 'active');
            tabButtons[index].classList.add('active');
            currentTabIndex = index;
            updateProgress();
        }
        if (prevTabBtn) prevTabBtn.disabled = currentTabIndex === 0;
        if (nextTabBtn) nextTabBtn.disabled = currentTabIndex === tabButtons.length - 1;
    }
    if (nextTabBtn) {
        nextTabBtn.addEventListener('click', () => {
            if (currentTabIndex < tabButtons.length - 1) showTab(currentTabIndex + 1);
        });
    }
    if (prevTabBtn) {
        prevTabBtn.addEventListener('click', () => {
            if (currentTabIndex > 0) showTab(currentTabIndex - 1);
        });
    }
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => showTab(index));
    });
    updateProgress();

    // --- fetch preview next-form-number ---
    async function fetchNextFormNumberPreview() {
        setPreviewNumber('...');
        if (startFormWarning) {
            startFormWarning.style.display = 'none';
            startFormWarning.textContent = '';
        }
        try {
            const res = await fetch('/orders/next-form-number');
            if (!res.ok) {
                // non-2xx response
                serverNextFormNumber = null;
                setPreviewNumber('...');
                return;
            }
            const data = await res.json();
            if (data && data.success) {
                serverNextFormNumber = Number(data.next_form_number);
                if (Number.isNaN(serverNextFormNumber)) {
                    serverNextFormNumber = null;
                    setPreviewNumber('...');
                } else {
                    setPreviewNumber(serverNextFormNumber);
                    // show helpful note if element exists
                    if (startFormNote) {
                        const currentMax = serverNextFormNumber - 1;
                        startFormNote.textContent = `بیشینه فعلی شماره‌ها: ${currentMax}. اگر شماره شروع درخواستی بزرگ‌تر از ${currentMax} باشد، پذیرفته می‌شود.`;
                    }
                }
            } else {
                serverNextFormNumber = null;
                setPreviewNumber('...');
            }
        } catch (err) {
            console.error('Error fetching next form number:', err);
            serverNextFormNumber = null;
            setPreviewNumber('...');
        }
    }

    // --- modal show handler (uses jQuery bootstrap modal event) ---
    if (typeof $ === 'function' && $(createOrderModalSelector).length) {
        $(createOrderModalSelector).on('show.bs.modal', function () {
            // Set created_at: prefer convertToJalali if available, else ISO-like local
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;

                if (createdAtEl) {
                    if (typeof convertToJalali === 'function') {
                        try {
                            const jalali = convertToJalali(datetimeString);
                            createdAtEl.value = jalali;
                        } catch (err) {
                            // fallback to ISO local-like string
                            createdAtEl.value = datetimeString;
                        }
                    } else {
                        createdAtEl.value = datetimeString;
                    }
                }
            } catch (err) {
                console.warn('Error setting created_at:', err);
            }

            // Reset start_form input & warning
            if (startFormInput) {
                startFormInput.value = '';
                startFormInput.disabled = false;
            }
            if (startFormWarning) {
                startFormWarning.style.display = 'none';
                startFormWarning.textContent = '';
            }

            // Fetch preview from server
            fetchNextFormNumberPreview();

            // Fetch and apply permissions
            fetchPermissions().then(perms => applyPermissionsToAddForm(perms));
        });
    } else {
        // If jQuery/modal not available, still fetch preview when script runs
        fetchNextFormNumberPreview();
        fetchPermissions().then(perms => applyPermissionsToAddForm(perms));
    }

    // --- start_form input live behavior ---
    if (startFormInput) {
        startFormInput.addEventListener('input', function () {
            const val = safeNumber(startFormInput.value);
            if (!val || val <= 0) {
                // invalid or empty: show server preview
                setPreviewNumber(serverNextFormNumber);
                if (startFormWarning) startFormWarning.style.display = 'none';
                return;
            }
            if (serverNextFormNumber !== null && !isNaN(serverNextFormNumber)) {
                const currentMax = serverNextFormNumber - 1;
                if (val <= currentMax) {
                    // warn user
                    if (startFormWarning) {
                        startFormWarning.style.display = 'block';
                        startFormWarning.textContent = `توجه: شماره درخواستی (${val}) از یا برابر با بیشینه فعلی (${currentMax}) است. در این صورت سرور ممکن است آن را نادیده بگیرد.`;
                    }
                    setPreviewNumber(val);
                } else {
                    if (startFormWarning) startFormWarning.style.display = 'none';
                    setPreviewNumber(val);
                }
            } else {
                // unknown server value, show typed value
                if (startFormWarning) startFormWarning.style.display = 'none';
                setPreviewNumber(val);
            }
        });
    }

    // --- form submit handling (jQuery) ---
    if (typeof $ === 'function' && $(createOrderFormSelector).length) {
        $(createOrderFormSelector).on('submit', function (e) {
            // Ensure preview field isn't sent
            if (formNumberInput) formNumberInput.disabled = true;

            // If start_form_number is empty => disable so it's not submitted
            if (startFormInput) {
                if (!startFormInput.value || String(startFormInput.value).trim() === '') {
                    startFormInput.disabled = true;
                } else {
                    startFormInput.disabled = false;
                }
            }

            // Convert Jalali dates to Gregorian before submission if helper exists
            try {
                const formEl = this;
                const dateInputs = formEl.querySelectorAll('input[data-jdp]');
                dateInputs.forEach(input => {
                    if (input.value && input.value.includes('/')) {
                        input.setAttribute('data-jalali-value', input.value);
                        if (typeof convertToGregorian === 'function') {
                            try {
                                const gregorianDate = convertToGregorian(input.value);
                                input.value = gregorianDate;
                            } catch (err) {
                                // If conversion fails, leave value as-is
                                console.warn('Jalali→Gregorian conversion failed for', input, err);
                            }
                        }
                    }
                });
            } catch (err) {
                console.warn('Error during form submit preprocessing:', err);
            }

            // allow native submission to continue
        });
    } else {
        // If jQuery not present, do a plain submit listener as fallback
        const formEl = document.querySelector(createOrderFormSelector);
        if (formEl) {
            formEl.addEventListener('submit', function (e) {
                if (formNumberInput) formNumberInput.disabled = true;
                if (startFormInput) {
                    if (!startFormInput.value || String(startFormInput.value).trim() === '') {
                        startFormInput.disabled = true;
                    } else {
                        startFormInput.disabled = false;
                    }
                }

                // convert dates if needed
                const dateInputs = this.querySelectorAll('input[data-jdp]');
                dateInputs.forEach(input => {
                    if (input.value && input.value.includes('/')) {
                        input.setAttribute('data-jalali-value', input.value);
                        if (typeof convertToGregorian === 'function') {
                            try {
                                const gregorianDate = convertToGregorian(input.value);
                                input.value = gregorianDate;
                            } catch (err) {
                                console.warn('Jalali→Gregorian conversion failed for', input, err);
                            }
                        }
                    }
                });
            });
        }
    }

    // --- calculate cut logic ---
    function calculateCut() {
        const heightEl = document.getElementById('height');
        const fabricCutEl = document.getElementById('fabric_cut');
        if (!heightEl || !fabricCutEl) return;
        const height = parseFloat(heightEl.value) || 0;
        const cut = height + 1.6;
        fabricCutEl.value = cut.toFixed(2);
    }
    const heightInput = document.getElementById('height');
    if (heightInput) {
        heightInput.addEventListener('change', calculateCut);
        // initial calculation
        calculateCut();
    }

    // --- dropdown setup helper (keeps existing behavior) ---
    function setupDropdown(dropdownButtonId, hiddenInputId) {
        const dropdownButton = document.getElementById(dropdownButtonId);
        const hiddenInput = document.getElementById(hiddenInputId);
        if (!dropdownButton || !hiddenInput) return;
        const selector = `.dropdown-menu[aria-labelledby='${dropdownButtonId}'] .dropdown-item[data-value]`;
        document.querySelectorAll(selector).forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const value = this.getAttribute('data-value') || this.textContent.trim();
                const parentSubmenu = this.closest('.dropdown-submenu');
                if (parentSubmenu) {
                    const parentToggle = parentSubmenu.querySelector('.dropdown-toggle');
                    const parentValue = parentToggle ? parentToggle.textContent.trim() : '';
                    const combined = `${parentValue} - ${value}`;
                    dropdownButton.textContent = combined;
                    hiddenInput.value = combined;
                } else {
                    dropdownButton.textContent = value;
                    hiddenInput.value = value;
                }
            });
        });
    }

    // --- customer suggestions (keeps existing behavior) ---
    function initCustomerSuggestions() {
        const customerInput = document.getElementById('customer_name');
        const suggestionList = document.getElementById('name_suggestions');
        if (!customerInput || !suggestionList) return;

        const customers = [
            "حمید قصوری",
            "کومار",
            "هادی زاده",
            "تولیدی مونته",
            "تولیدی رومن",
            "محمودی",
            "تولیدی T&T",
            "تولیدی زاروتی",
            "تولیدی نولا",
            "مصباح",
            "بابک فرزانه",
            "موسوی بهار",
            "سعادتی",
            "ارفعی",
            "کفشگر",
            "موسوی تیما",
            "اندیشه",
            "گلها",
            "مهدی نوده",
            "رحمانی"
        ];
        let currentIndex = -1;

        function showSuggestions(value) {
            const v = value.trim();
            suggestionList.innerHTML = '';
            currentIndex = -1;
            if (v === '') {
                suggestionList.style.display = 'none';
                return;
            }
            const filtered = customers.filter(c => c.includes(v));
            if (filtered.length === 0) {
                suggestionList.style.display = 'none';
                return;
            }
            filtered.forEach((name, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                li.textContent = name;
                li.tabIndex = 0;
                li.addEventListener('click', () => {
                    customerInput.value = name;
                    suggestionList.style.display = 'none';
                });
                suggestionList.appendChild(li);
            });
            suggestionList.style.display = 'block';
        }

        function highlightItem(index) {
            const items = suggestionList.querySelectorAll('li');
            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
                if (i === index) item.scrollIntoView({ block: 'nearest' });
            });
        }

        customerInput.addEventListener('input', () => showSuggestions(customerInput.value));

        customerInput.addEventListener('keydown', (e) => {
            const items = suggestionList.querySelectorAll('li');
            if (!items || items.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex < items.length - 1) currentIndex++;
                highlightItem(currentIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentIndex > 0) currentIndex--;
                highlightItem(currentIndex);
            } else if (e.key === 'Enter') {
                if (currentIndex >= 0 && currentIndex < items.length) {
                    e.preventDefault();
                    customerInput.value = items[currentIndex].textContent;
                    suggestionList.style.display = 'none';
                }
            } else if (e.key === 'Escape') {
                suggestionList.style.display = 'none';
                currentIndex = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!suggestionList.contains(e.target) && e.target !== customerInput) {
                suggestionList.style.display = 'none';
            }
        });

        suggestionList.style.display = 'none';
    }

    // --- initialize dropdowns and suggestions used in your markup ---
    try {
        setupDropdown("laminationDropdown", "lamination_type");
        setupDropdown("editLaminationDropdown", "edit_lamination_type");
    } catch (err) {
        console.warn('Dropdown setup error:', err);
    }
    try {
        initCustomerSuggestions();
    } catch (err) {
        console.warn('Customer suggestions init error:', err);
    }
}

// Auto-run on DOMContentLoaded for convenience if this file is included directly
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAddOrder);
    } else {
        // already ready
        initAddOrder();
    }
}
