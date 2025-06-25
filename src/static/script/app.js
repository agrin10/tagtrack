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