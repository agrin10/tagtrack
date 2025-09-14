// JalaliDatePicker initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add custom CSS for RTL support and modal z-index fix
    const style = document.createElement('style');
    style.textContent = `
        .jdp-container {
            direction: rtl !important;
            text-align: right !important;
            z-index: 9999 !important;
        }
        .jdp-container .jdp-day {
            text-align: center !important;
        }
        .jdp-container .jdp-month {
            text-align: center !important;
        }
        .jdp-container .jdp-year {
            text-align: center !important;
        }
        .jdp-container .jdp-header {
            text-align: center !important;
        }
        .jdp-container .jdp-weekdays {
            text-align: center !important;
        }
        .jdp-container .jdp-days {
            text-align: center !important;
        }
        .jdp-container .jdp-footer {
            text-align: center !important;
        }
        .jdp-container .jdp-btn {
            font-family: inherit !important;
        }
        /* Ensure datepicker appears above modals */
        .jdp-container {
            position: fixed !important;
            z-index: 9999 !important;
        }
        /* Modal z-index is typically 1050, so we need higher */
        .modal {
            z-index: 1050 !important;
        }
        .modal-backdrop {
            z-index: 1040 !important;
        }
    `;
    document.head.appendChild(style);

    // Initialize JalaliDatePicker for all date inputs
    jalaliDatepicker.startWatch({
        separatorChar: "/",
        minDate: "today",
        initDate: false,
        autoShow: true,
        autoHide: true,
        hideAfterChange: true,
        useDropDownYears: true,
        persianDigits: false,
        showTodayBtn: true,
        showEmptyBtn: true,
        showCloseBtn: true,
        autoReadOnlyInput: true,
        topSpace: 10,
        bottomSpace: 10,
        overflowSpace: 10,
        zIndex: 9999,
        container: "body",
        days: ["ش", "ی", "د", "س", "چ", "پ", "ج"],
        months: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
    });


    function convertToGregorian(jalaliDate) {
        if (!jalaliDate) return '';
        
        // Parse Jalali date (format: YYYY/MM/DD)
        const parts = jalaliDate.split('/');
        if (parts.length !== 3) return jalaliDate;
        
        const jalaliYear = parseInt(parts[0]);
        const jalaliMonth = parseInt(parts[1]);
        const jalaliDay = parseInt(parts[2]);
        
        // Accurate conversion back to Gregorian
        let gregorianYear = jalaliYear + 621;
        let gregorianMonth = jalaliMonth - 2;
        let gregorianDay = jalaliDay;
        
        // Adjust for month boundaries
        if (gregorianMonth <= 0) {
            gregorianMonth += 12;
            gregorianYear -= 1;
        }
        
        // Adjust days for month lengths
        const gregorianMonthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (gregorianDay > gregorianMonthDays[gregorianMonth - 1]) {
            gregorianDay = gregorianMonthDays[gregorianMonth - 1];
        }
        
        const date = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
        return date.toISOString().split('T')[0];
    }

    // Handle form submission to convert Jalali dates back to Gregorian
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            const dateInputs = form.querySelectorAll('input[data-jdp]');
            dateInputs.forEach(input => {
                if (input.value) {
                    // Store the Jalali value for display
                    input.setAttribute('data-jalali-value', input.value);
                    // Convert to Gregorian for backend
                    const gregorianDate = convertToGregorian(input.value);
                    input.value = gregorianDate;
                }
            });
        }
    });

    // Handle form reset to restore Jalali values
    document.addEventListener('reset', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            const dateInputs = form.querySelectorAll('input[data-jdp]');
            dateInputs.forEach(input => {
                const jalaliValue = input.getAttribute('data-jalali-value');
                if (jalaliValue) {
                    input.value = jalaliValue;
                }
            });
        }
    });

    // Initialize date inputs in modals when they are shown
    document.addEventListener('shown.bs.modal', function(e) {
        const modal = e.target;
        const dateInputs = modal.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            // Add data-jdp attribute to enable JalaliDatePicker
            input.setAttribute('data-jdp', '');
            // Remove type="date" to prevent browser's default date picker
            input.removeAttribute('type');
            input.setAttribute('type', 'text');
        });
        
        // Ensure datepicker appears above modal
        const modalZIndex = parseInt(window.getComputedStyle(modal).zIndex) || 1050;
        const datepickerZIndex = modalZIndex + 100;
        
        // Update CSS for this specific modal
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .jdp-container {
                z-index: ${datepickerZIndex} !important;
                position: fixed !important;
            }
        `;
        document.head.appendChild(modalStyle);
    });

    // Initialize existing date inputs on page load
    const existingDateInputs = document.querySelectorAll('input[type="date"]');
    existingDateInputs.forEach(input => {
        // Add data-jdp attribute to enable JalaliDatePicker
        input.setAttribute('data-jdp', '');
        // Remove type="date" to prevent browser's default date picker
        input.removeAttribute('type');
        input.setAttribute('type', 'text');
    });
    
    // Handle datepicker positioning when it appears
    document.addEventListener('click', function(e) {
        if (e.target.hasAttribute('data-jdp')) {
            // Wait a bit for the datepicker to appear, then adjust z-index
            setTimeout(() => {
                const datepicker = document.querySelector('.jdp-container');
                if (datepicker) {
                    // Find the highest z-index in the document
                    const allElements = document.querySelectorAll('*');
                    let maxZIndex = 0;
                    allElements.forEach(el => {
                        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
                        if (zIndex > maxZIndex) {
                            maxZIndex = zIndex;
                        }
                    });
                    
                    // Set datepicker z-index higher than everything else
                    datepicker.style.zIndex = (maxZIndex + 100).toString();
                    datepicker.style.position = 'fixed';
                }
            }, 100);
        }
    });
}); 