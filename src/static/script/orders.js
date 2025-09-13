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
});

