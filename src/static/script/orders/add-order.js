document.addEventListener('DOMContentLoaded', function() {
    // Add file row functionality for create order modal
    const addFileRowBtn = document.getElementById('addFileRowBtn');
    if (addFileRowBtn) {
        addFileRowBtn.addEventListener('click', function() {
            const tbody = document.getElementById('filesTableBody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" name="file_display_names[]"></td>
                <td><input type="text" class="form-control form-control-sm" name="order_files[]"></td>
            `;
            tbody.appendChild(newRow);
        });
    }

    // Tab navigation functionality
    const nextTabBtn = document.getElementById('nextTab');
    const prevTabBtn = document.getElementById('prevTab');
    const tabButtons = document.querySelectorAll('#orderFormTabs .nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const progressBar = document.getElementById('formProgress');

    let currentTabIndex = 0;

    // Function to update progress bar
    function updateProgress() {
        const progress = ((currentTabIndex + 1) / tabButtons.length) * 100;
        progressBar.style.width = progress + '%';
    }

    // Function to show specific tab
    function showTab(index) {
        // Hide all tabs
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show specific tab
        if (index >= 0 && index < tabButtons.length) {
            tabPanes[index].classList.add('show', 'active');
            tabButtons[index].classList.add('active');
            currentTabIndex = index;
            updateProgress();
        }

        // Update button states
        prevTabBtn.disabled = currentTabIndex === 0;
        nextTabBtn.disabled = currentTabIndex === tabButtons.length - 1;
    }

    // Next button click handler
    if (nextTabBtn) {
        nextTabBtn.addEventListener('click', function() {
            if (currentTabIndex < tabButtons.length - 1) {
                showTab(currentTabIndex + 1);
            }
        });
    }

    // Previous button click handler
    if (prevTabBtn) {
        prevTabBtn.addEventListener('click', function() {
            if (currentTabIndex > 0) {
                showTab(currentTabIndex - 1);
            }
        });
    }

    // Tab button click handlers
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            showTab(index);
        });
    });

    // Initialize progress bar
    updateProgress();

    // Populate form number and created date when modal opens
    $('#createOrderModal').on('show.bs.modal', function() {
        // Get current timestamp for created_at
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Set the created_at field
        document.getElementById('created_at').value = datetimeString;
        
        // Fetch preview form number from server
        fetch('/orders/next-form-number')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('form_number').value = data.next_form_number;
                } else {
                    console.error('Failed to get next form number:', data.error);
                    document.getElementById('form_number').value = '...';
                }
            })
            .catch(error => {
                console.error('Error fetching next form number:', error);
                document.getElementById('form_number').value = '...';
            });
    });

    // Handle form submission to ensure form number is not sent and convert Jalali dates
    $('#createOrderForm').on('submit', function(e) {
        // Remove the form_number from the form data since it should be generated server-side
        const formNumberInput = document.getElementById('form_number');
        if (formNumberInput) {
            formNumberInput.disabled = true; // Disable to prevent it from being sent
        }
        
        // Convert Jalali dates to Gregorian before submission
        const dateInputs = this.querySelectorAll('input[data-jdp]');
        dateInputs.forEach(input => {
            if (input.value && input.value.includes('/')) {
                // Store the Jalali value for potential restoration
                input.setAttribute('data-jalali-value', input.value);
                // This is a Jalali date, convert to Gregorian
                const gregorianDate = convertToGregorian(input.value);
                input.value = gregorianDate;
            }
        });
    });

    // JalaliDatePicker will be automatically initialized for all inputs with data-jdp attribute

    // Calculate cut functionality
    function calculateCut() {
        const height = parseFloat(document.getElementById('height').value) || 0;
        const cut = height + 1.6;
        document.getElementById('fabric_cut').value = cut.toFixed(2);
    }
    const heightInput = document.getElementById('height');
    if (heightInput) {
        heightInput.addEventListener('change', calculateCut);
        calculateCut();
    }

    // Dropdown functionality for lamination
    const dropdownButton = document.getElementById("laminationDropdown");
    const hiddenInput = document.getElementById("lamination_type");
    if (dropdownButton && hiddenInput) {
        document.querySelectorAll(".dropdown-item[data-value]").forEach(item => {
            item.addEventListener("click", function (e) {
                e.preventDefault();
                const value = this.getAttribute("data-value");
                dropdownButton.textContent = value;
                hiddenInput.value = value;
            });
        });
    }
});

export function initAddOrder() {
    // Add file row functionality for create order modal
    const addFileRowBtn = document.getElementById('addFileRowBtn');
    if (addFileRowBtn) {
        addFileRowBtn.addEventListener('click', function() {
            const tbody = document.getElementById('filesTableBody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" name="file_display_names[]"></td>
                <td><input type="text" class="form-control form-control-sm" name="order_files[]"></td>
            `;
            tbody.appendChild(newRow);
        });
    }

    // Tab navigation functionality
    const nextTabBtn = document.getElementById('nextTab');
    const prevTabBtn = document.getElementById('prevTab');
    const tabButtons = document.querySelectorAll('#orderFormTabs .nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const progressBar = document.getElementById('formProgress');

    let currentTabIndex = 0;

    // Function to update progress bar
    function updateProgress() {
        const progress = ((currentTabIndex + 1) / tabButtons.length) * 100;
        progressBar.style.width = progress + '%';
    }

    // Function to show specific tab
    function showTab(index) {
        // Hide all tabs
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show specific tab
        if (index >= 0 && index < tabButtons.length) {
            tabPanes[index].classList.add('show', 'active');
            tabButtons[index].classList.add('active');
            currentTabIndex = index;
            updateProgress();
        }

        // Update button states
        prevTabBtn.disabled = currentTabIndex === 0;
        nextTabBtn.disabled = currentTabIndex === tabButtons.length - 1;
    }

    // Next button click handler
    if (nextTabBtn) {
        nextTabBtn.addEventListener('click', function() {
            if (currentTabIndex < tabButtons.length - 1) {
                showTab(currentTabIndex + 1);
            }
        });
    }

    // Previous button click handler
    if (prevTabBtn) {
        prevTabBtn.addEventListener('click', function() {
            if (currentTabIndex > 0) {
                showTab(currentTabIndex - 1);
            }
        });
    }

    // Tab button click handlers
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            showTab(index);
        });
    });

    // Initialize progress bar
    updateProgress();

    // Populate form number and created date when modal opens
    $('#createOrderModal').on('show.bs.modal', function() {
        // Get current timestamp for created_at
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Set the created_at field
        document.getElementById('created_at').value = datetimeString;
        
        // Fetch preview form number from server
        fetch('/orders/next-form-number')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('form_number').value = data.next_form_number;
                } else {
                    console.error('Failed to get next form number:', data.error);
                    document.getElementById('form_number').value = '...';
                }
            })
            .catch(error => {
                console.error('Error fetching next form number:', error);
                document.getElementById('form_number').value = '...';
            });
    });

    // Handle form submission to ensure form number is not sent and convert Jalali dates
    $('#createOrderForm').on('submit', function(e) {
        // Remove the form_number from the form data since it should be generated server-side
        const formNumberInput = document.getElementById('form_number');
        if (formNumberInput) {
            formNumberInput.disabled = true; // Disable to prevent it from being sent
        }
        
        // Convert Jalali dates to Gregorian before submission
        const dateInputs = this.querySelectorAll('input[data-jdp]');
        dateInputs.forEach(input => {
            if (input.value && input.value.includes('/')) {
                // Store the Jalali value for potential restoration
                input.setAttribute('data-jalali-value', input.value);
                // This is a Jalali date, convert to Gregorian
                const gregorianDate = convertToGregorian(input.value);
                input.value = gregorianDate;
            }
        });
    });

    // JalaliDatePicker will be automatically initialized for all inputs with data-jdp attribute

    // Calculate cut functionality
    function calculateCut() {
        const height = parseFloat(document.getElementById('height').value) || 0;
        const cut = height + 1.6;
        document.getElementById('fabric_cut').value = cut.toFixed(2);
    }
    const heightInput = document.getElementById('height');
    if (heightInput) {
        heightInput.addEventListener('change', calculateCut);
        calculateCut();
    }

    // Dropdown functionality for lamination
    const dropdownButton = document.getElementById("laminationDropdown");
    const hiddenInput = document.getElementById("lamination_type");
    if (dropdownButton && hiddenInput) {
        document.querySelectorAll(".dropdown-item[data-value]").forEach(item => {
            item.addEventListener("click", function (e) {
                e.preventDefault();
                const value = this.getAttribute("data-value");
                dropdownButton.textContent = value;
                hiddenInput.value = value;
            });
        });
    }
}
