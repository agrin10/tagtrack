// Update the date dynamically using Moment.js
document.addEventListener('DOMContentLoaded', function() {
    const dateElement = document.querySelector('.header .welcome-text p');
    if (dateElement) {
        dateElement.textContent = moment().format('dddd, MMMM D, YYYY');
    }
});
