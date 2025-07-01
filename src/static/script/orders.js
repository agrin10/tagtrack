import { showAlert } from './utils/alert.js';
import { initDeleteOrder } from './orders/deleteOrder.js';
import { initEditOrder } from './orders/editOrder.js';
import { initDuplicateOrder } from './orders/duplicateOrder.js';
import { initExportExcel } from './orders/exportExcel.js';
import { initFilters } from './orders/filters.js';
import { initOrderDetails } from './orders/orderDetails.js';
import { previewDetailImage, previewEditImage } from './orders/imagePreview.js';

// Initialize all modules on DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
  initOrderDetails();
  initDeleteOrder();
  initEditOrder();
  initDuplicateOrder();
  initExportExcel();
  initFilters();
  window.previewDetailImage = previewDetailImage;
  window.previewEditImage = previewEditImage;
});

