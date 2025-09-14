
// Persian date conversion helper (simple fallback)
document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-order-id');
        if (!orderId) return;

        const previewPanel = document.getElementById('orderPreviewPanel');
        const previewContent = document.getElementById('orderPreviewContent');
        previewContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">در حال بارگذاری پیش‌نمایش...</p>
            </div>
        `;
        const offcanvas = new bootstrap.Offcanvas(previewPanel);
        offcanvas.show();

        fetch(`/orders/${orderId}`)
            .then(res => res.json())
            .then(data => {
                const order = data.order;
                if (!order) throw new Error('Order data not found');

                // Images
                let imagesHtml = '';
                if (order.images && order.images.length > 0) {
                    imagesHtml = `<div class="row g-2 mb-2">` +
                        order.images.map(img => `
                            <div class="col-4">
                                <img src="/orders/images/${img.id}" alt="${img.original_filename}" class="img-fluid rounded mb-1" style="height:120px;object-fit:cover;">
                                <div class="small text-muted text-truncate">${img.original_filename}</div>
                            </div>
                        `).join('') +
                        `</div>`;
                } else {
                    imagesHtml = `<div class="alert alert-secondary">تصویری ثبت نشده است.</div>`;
                }

                // Files
                let filesHtml = '';
                if (order.order_files && order.order_files.length > 0) {
                    filesHtml = `<ul class="list-unstyled">` +
                        order.order_files.map(file => `
                            <li>
                                <i class="fas fa-file me-1"></i>
                                <span>${file.display_name || file.file_name}</span>
                            </li>
                        `).join('') +
                        `</ul>`;
                } else {
                    filesHtml = `<div class="alert alert-secondary">فایلی ثبت نشده است.</div>`;
                }

                // Values
                let valuesHtml = '';
                if (order.values && Array.isArray(order.values)) {
                    // Filter out empty strings, null, or undefined
                    const filteredValues = order.values.filter(v => v && v.trim() !== '');
                    if (filteredValues.length > 0) {
                        valuesHtml = `<ul class="list-unstyled">` +
                            filteredValues.map(val => `
                                <li>
                                    <span class="badge bg-light text-dark">${val}</span>
                                </li>
                            `).join('') +
                            `</ul>`;
                    } else {
                        valuesHtml = `<div class="alert alert-secondary">مقادیری ثبت نشده</div>`;
                    }
                } else {
                    valuesHtml = `<div class="alert alert-secondary">مقادیری ثبت نشده</div>`;
                }

                previewContent.innerHTML = `
                    <h5 class="mb-2">${order.form_number ?? '-'}</h5>
                    <span class="badge bg-info mb-2">${order.status ?? '-'}</span>
                    <hr>
                    <div class="row mb-2">
                        <div class="col-6"><strong>نام مشتری:</strong> ${order.customer_name ?? '-'}</div>
                        <div class="col-6"><strong>نام طرح:</strong> ${order.sketch_name ?? '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>تراکم پارچه:</strong> ${order.fabric_density ?? '-'}</div>
                        <div class="col-6"><strong>کد برش پارچه:</strong> ${order.fabric_cut ?? '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>عرض:</strong> ${order.width ? order.width + ' cm' : '-'}</div>
                        <div class="col-6"><strong>ارتفاع:</strong> ${order.height ? order.height + ' cm' : '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>تعداد:</strong> ${order.quantity ?? '-'}</div>
                        <div class="col-6"><strong>متر کل:</strong> ${order.total_length_meters ? order.total_length_meters + ' m' : '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>نوع لمینیشن:</strong> ${order.lamination_type ?? '-'}</div>
                        <div class="col-6"><strong>نوع برش:</strong> ${order.cut_type ?? '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>نوع لیبل:</strong> ${order.label_type ?? '-'}</div>
                        <div class="col-6"><strong>نوع فیوزینگ:</strong> ${order.fusing_type ?? '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>تاریخ تحویل:</strong> ${convertToJalali(order.delivery_date)}</div>
                        <div class="col-6"><strong>خروج از دفتر:</strong> ${convertToJalali(order.exit_from_office_date)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-6"><strong>خروج از کارخانه:</strong> ${convertToJalali(order.exit_from_factory_date)}</div>
                        <div class="col-6"><strong>تاریخ ثبت:</strong> ${convertToJalali(order.created_at)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-12"><strong>ثبت‌کننده:</strong> ${order.created_by_username ?? '-'}</div>
                    </div>
                    <div class="mb-2"><strong>مشخصات طراحی:</strong> <div>${order.design_specification ?? '-'}</div></div>
                    <div class="mb-2"><strong>یادداشت دفتر:</strong> <div>${order.office_notes ?? '-'}</div></div>
                    <div class="mb-2"><strong>یادداشت کارخانه:</strong> <div>${order.factory_notes ?? '-'}</div></div>
                    <div class="mb-2"><strong>یادداشت مشتری به دفتر:</strong> <div>${order.customer_note_to_office ?? '-'}</div></div>
                    <div class="mb-2"><strong>مقادیر:</strong> ${valuesHtml}</div>
                    <div class="mb-2"><strong>فایل‌ها:</strong> ${filesHtml}</div>
                    <div class="mb-2"><strong>تصاویر:</strong> ${imagesHtml}</div>
                `;
            })
            .catch(error => {
                console.error('Preview panel error:', error); // <-- This logs the error to the console
                previewContent.innerHTML = `<div class="alert alert-danger">خطا: ${error.message}</div>`;
            });
    });
});