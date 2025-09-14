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

function gregorianToJalali(gy, gm, gd) {
    const g_days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
    const j_days_in_month = [31,31,31,31,31,31,30,30,30,30,30,29];

    let gy2 = gy - 1600;
    let gm2 = gm - 1;
    let gd2 = gd - 1;

    let g_day_no = 365*gy2 + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400);
    for (let i = 0; i < gm2; ++i) g_day_no += g_days_in_month[i];
    if (gm2 > 1 && ((gy%4===0 && gy%100!==0) || (gy%400===0))) g_day_no += 1; // leap day
    g_day_no += gd2;

    let j_day_no = g_day_no - 79;

    let j_np = Math.floor(j_day_no / 12053);
    j_day_no = j_day_no % 12053;

    let jy = 979 + 33*j_np + 4*Math.floor(j_day_no/1461);
    j_day_no %= 1461;

    if (j_day_no >= 366) {
        jy += Math.floor((j_day_no-366)/365);
        j_day_no = (j_day_no-366) % 365;
    }

    // compute month/day
    let i = 0;
    for (; i < 11 && j_day_no >= j_days_in_month[i]; ++i) {
        j_day_no -= j_days_in_month[i];
    }
    const jm = i + 1;
    const jd = j_day_no + 1;

    // *** fix: add +1 to jy to align with standard Jalali year numbering ***
    return { jy: jy + 1, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
    const g_days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
    const j_days_in_month = [31,31,31,31,31,31,30,30,30,30,30,29];

    jy -= 979;
    jm -= 1;
    jd -= 1;

    let j_day_no = 365*jy + Math.floor(jy/33)*8 + Math.floor((jy%33 +3)/4);
    for (let i = 0; i < jm; ++i) j_day_no += j_days_in_month[i];
    j_day_no += jd;

    let g_day_no = j_day_no + 79;

    let gy = 1600 + 400*Math.floor(g_day_no/146097);
    g_day_no = g_day_no % 146097;

    let leap = true;
    if (g_day_no >= 36525) {
        g_day_no--;
        gy += 100*Math.floor(g_day_no/36524);
        g_day_no = g_day_no % 36524;
        if (g_day_no >= 365) g_day_no++;
        else leap = false;
    }

    gy += 4*Math.floor(g_day_no/1461);
    g_day_no %= 1461;

    if (g_day_no >= 366) {
        leap = false;
        g_day_no--;
        gy += Math.floor(g_day_no/365);
        g_day_no = g_day_no % 365;
    }

    // declare i outside loop so it can be used to compute gm/gd afterwards
    let i = 0;
    for (; i < 12 && g_day_no >= g_days_in_month[i] + ((i === 1 && leap) ? 1 : 0); ++i) {
        g_day_no -= g_days_in_month[i] + ((i === 1 && leap) ? 1 : 0);
    }
    const gm = i + 1;
    const gd = g_day_no + 1;

    return { gy, gm, gd };
}

// --- safe wrappers you can call from other code ---

// convertToJalali: accepts "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS" or Date object
function convertToJalali(input) {
    if (!input) return '';
    // handle Date object
    if (input instanceof Date && !isNaN(input)) {
        const gy = input.getFullYear();
        const gm = input.getMonth() + 1;
        const gd = input.getDate();
        const j = gregorianToJalali(gy, gm, gd);
        return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
    }
    // handle strings
    const s = String(input);
    const datePart = s.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return input;
    const gy = parseInt(parts[0],10);
    const gm = parseInt(parts[1],10);
    const gd = parseInt(parts[2],10);
    if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return input;
    const j = gregorianToJalali(gy, gm, gd);
    return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
}

// convertToGregorian: accepts "YYYY/MM/DD" (Jalali) and returns "YYYY-MM-DD" (Gregorian)
function convertToGregorian(jalaliDate) {
    if (!jalaliDate) return '';
    const s = String(jalaliDate).trim();
    const parts = s.split(/[\/\-]/); // accept "/" or "-"
    if (parts.length !== 3) return jalaliDate;
    const jy = parseInt(parts[0],10);
    const jm = parseInt(parts[1],10);
    const jd = parseInt(parts[2],10);
    if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return jalaliDate;
    const g = jalaliToGregorian(jy, jm, jd);
    // Return YYYY-MM-DD
    return `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}`;
}



