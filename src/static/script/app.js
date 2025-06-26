// Update the date dynamically using Moment.js
document.addEventListener('DOMContentLoaded', function() {
    const dateElement = document.querySelector('.header .welcome-text p');
    if (dateElement) {
        dateElement.textContent = moment().format('dddd, MMMM D, YYYY');
    }
});

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