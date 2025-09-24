export function initCustomerSuggestions(inputId, suggestionListId) {
    const customerInput = document.getElementById(inputId);
    const suggestionList = document.getElementById(suggestionListId);
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
