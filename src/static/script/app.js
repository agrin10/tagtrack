document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
  
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  });

/**
 * General search/filter for tables or lists.
 * @param {string} inputSelector - CSS selector for the search input.
 * @param {string} rowSelector - CSS selector for the rows to filter (e.g., 'tbody tr' or '.list-group-item').
 */
function setupTableSearch(inputSelector, rowSelector) {
    const searchInput = document.querySelector(inputSelector);
    if (!searchInput) return;

    const rows = document.querySelectorAll(rowSelector);

    searchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        rows.forEach(row => {
            const text = row.textContent.trim().toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

// Make it available globally if needed
window.setupTableSearch = setupTableSearch;

    function convertToJalali(gregorianDate) {
        if (!gregorianDate) return '';
        
        const date = new Date(gregorianDate);
        const gregorianYear = date.getFullYear();
        const gregorianMonth = date.getMonth() + 1;
        const gregorianDay = date.getDate();
        
        // Accurate Jalali calendar conversion
        let jalaliYear = gregorianYear - 621;
        let jalaliMonth = gregorianMonth + 2;
        let jalaliDay = gregorianDay;
        
        // Adjust for leap years and month lengths
        if (jalaliMonth > 12) {
            jalaliMonth -= 12;
            jalaliYear += 1;
        }
        
        // Adjust days for month lengths
        const jalaliMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
        if (jalaliDay > jalaliMonthDays[jalaliMonth - 1]) {
            jalaliDay = jalaliMonthDays[jalaliMonth - 1];
        }
        
        return `${jalaliYear}/${jalaliMonth.toString().padStart(2, '0')}/${jalaliDay.toString().padStart(2, '0')}`;
    }

    // Helper function to convert Jalali date to Gregorian format
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
