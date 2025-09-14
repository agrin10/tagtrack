import { showAlert } from './utils/alert.js';
import { initDeleteOrder } from './orders/deleteOrder.js';
import { initEditOrder } from './orders/editOrder.js';
import { initDuplicateOrder } from './orders/duplicateOrder.js';
import { initExportExcel } from './orders/exportExcel.js';
import { initFilters } from './orders/filters.js';
import { initOrderDetails } from './orders/orderDetails.js';
import { previewDetailImage, previewEditImage } from './orders/imagePreview.js';
import { initDownloadPdf } from './orders/downloadPdf.js';
import { initAddOrder } from './orders/add-order.js';

// Initialize all modules on DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
  initAddOrder();
  initOrderDetails();
  initDeleteOrder();
  initEditOrder();
  initDuplicateOrder();
  initExportExcel();
  initFilters();
  initDownloadPdf();
  window.previewDetailImage = previewDetailImage;
  window.previewEditImage = previewEditImage;
  
  const colors = ["مشکی","میشی","سفید","قرمز","آبی","سبز","زرد","نقره‌ای","طلایی","بژ", "بنفش"];

  document.querySelectorAll('.color-input').forEach(input => {
      const suggestionBox = input.parentElement.querySelector('.suggestions');

      input.addEventListener('input', () => {
          const value = input.value.trim();
          suggestionBox.innerHTML = '';
          if (!value) {
              suggestionBox.style.display = 'none';
              return;
          }
          const matched = colors.filter(c => c.startsWith(value));
          matched.forEach(c => {
              const item = document.createElement('div');
              item.textContent = c;
              item.onclick = () => {
                  input.value = c;
                  suggestionBox.style.display = 'none';
              };
              suggestionBox.appendChild(item);
          });
          suggestionBox.style.display = matched.length ? 'block' : 'none';
      });

      document.addEventListener('click', e => {
          if (!suggestionBox.contains(e.target) && e.target !== input) {
              suggestionBox.style.display = 'none';
          }
      });
  });

});

