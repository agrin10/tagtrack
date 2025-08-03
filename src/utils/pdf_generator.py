from src.production.models import JobMetric, Machine, ProductionStepLog
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black, white, grey
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageTemplate, Frame
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.lib.units import cm
import arabic_reshaper
from bidi.algorithm import get_display
import io
from datetime import datetime
from typing import Tuple, Dict, Any
from src.order.models import Order, OrderValue, OrderFile
import traceback
import os

# Register Persian font
try:
    font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'fonts', 'Vazir.ttf')
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont('Vazir', font_path))
        print(f"Persian font 'Vazir' registered from {font_path}")
    else:
        print(f"Font file not found at {font_path}")
        # Try alternative font paths
        alt_font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'fonts', 'Vazir.woff')
        if os.path.exists(alt_font_path):
            pdfmetrics.registerFont(TTFont('Vazir', alt_font_path))
            print(f"Persian font 'Vazir' registered from {alt_font_path}")
        else:
            print("No Persian font found, using default font")
except Exception as e:
    print(f"Error registering Persian font: {e}")
    print("Using default font for Persian text")


def format_persian_text(text):
    """Format Persian text for proper display in PDF"""
    if not text:
        return '-'
    try:
        # Reshape Arabic/Persian text for proper display
        reshaped_text = arabic_reshaper.reshape(str(text))
        # Apply bidirectional algorithm for RTL text
        bidi_text = get_display(reshaped_text)
        return bidi_text
    except Exception as e:
        print(f"Error formatting Persian text '{text}': {str(e)}")
        # Fallback to simple string conversion
        return str(text) if text else '-'

def generate_order_pdf(order_id: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Generate a two-page PDF report for a specific order with the production form layout.
    Returns (success, response) where response contains either the PDF buffer or an error message.
    """
    try:
        print(f"Starting PDF generation for order {order_id}")
        
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            print(f"Order {order_id} not found")
            return False, {"error": "Order not found"}
        
        print(f"Found order: {order.form_number}")
        
        # Get related data
        job_metrics = JobMetric.query.filter_by(order_id=order_id).all()
        machine_data = Machine.query.filter_by(order_id=order_id).all()
        production_steps = ProductionStepLog.query.filter_by(order_id=order_id).all()
        
        print(f"Found {len(job_metrics)} job metrics, {len(machine_data)} machine records, {len(production_steps)} production steps")
        
        # Create PDF buffer
        pdf_buffer = io.BytesIO()
        
        # Create a custom page template with borders and RTL layout
        def add_border(canvas, doc):
            canvas.saveState()
            # Draw border around the page
            canvas.setStrokeColor(black)
            canvas.setLineWidth(2)
            canvas.rect(1*cm, 1*cm, A4[0]-2*cm, A4[1]-2*cm)
            canvas.restoreState()
        
        # Create page template with border and RTL frame
        page_template = PageTemplate(
            id='bordered_page',
            frames=[Frame(1.5*cm, 1.5*cm, A4[0]-3*cm, A4[1]-3*cm, id='normal', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
            onPage=add_border
        )
        
        # Create document with RTL support
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        doc.addPageTemplates([page_template])
        
        # Create story (content) for the PDF
        story = []
        
        # Page 1: Order Information, Machine Data, and Job Metrics
        print("Generating page 1 content...")
        story.extend(generate_page_one_content(order, machine_data))
        
        # Add شاخص کار section to page 1
        print("Adding شاخص کار to page 1...")
        story.extend(generate_job_metrics_section(order, job_metrics))
        
        # Page 2: Machine Data Section
        print("Generating page 2 content...")
        story.extend(generate_page_two_content(order, job_metrics, production_steps))
        
        # Build PDF
        print("Building PDF...")
        doc.build(story)
        pdf_buffer.seek(0)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"سفارش_{order.form_number}_{timestamp}.pdf"
        
        print(f"PDF generated successfully: {filename}")
        return True, {
            "pdf_buffer": pdf_buffer,
            "filename": filename
        }
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        traceback.print_exc()
        return False, {"error": f"Failed to generate PDF: {str(e)}"}

def generate_page_one_content(order, machine_data):
    story = []

    # 1. Top-Center Title - "به نام خدا" (In the name of God)
    # Large font (≈16 pt), centered, about 2 cm tall
    header_style = ParagraphStyle(
        'Header',
        fontName='Vazir',
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=8,
        spaceBefore=8
    )
    story.append(Paragraph(format_persian_text("به نام خدا"), header_style))
    story.append(Spacer(1, 8))

    # 2. First Info Row - Form style with dotted lines
    form_info_style = ParagraphStyle(
        'FormInfo',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=8,
        spaceBefore=8
    )
    
    form_number = str(order.form_number) if order.form_number else '...................'
    form_date = str(order.created_at.date()) if order.created_at else '...................'
    customer_name = order.customer_name if order.customer_name else '...................'
    
    # Use table layout for better spacing control - single row with three columns
    form_info_data = [
        [format_persian_text("شماره فرم:"), format_persian_text("تاریخ فرم:"), format_persian_text("نام مشتری:")],
        [format_persian_text(form_number), format_persian_text(form_date), format_persian_text(customer_name)]
    ]
    
    form_info_table = Table(form_info_data, colWidths=[5*cm, 5*cm, 6*cm])
    form_info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    story.append(form_info_table)
    story.append(Spacer(1, 8))

    # 3. Sketcher Name Line - Positioned a little in front and bit to center
    designer = order.sketch_name or '-'
    
    # Create a table to control positioning - move it forward and center it
    designer_data = [[format_persian_text(f"نام طرح: {designer}")]]
    designer_table = Table(designer_data, colWidths=[12*cm])  # Reduced width to center it
    designer_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 2*cm),  # Add left padding to move it forward
        ('RIGHTPADDING', (0,0), (-1,-1), 2*cm),  # Add right padding for centering
    ]))
    story.append(designer_table)
    
    # Single thin underline spanning the same width as the text
    underline_table = Table([['']], colWidths=[12*cm], rowHeights=[0.1*cm])
    underline_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (0,0), 1, black),
        ('LEFTPADDING', (0,0), (-1,-1), 2*cm),  # Match the text positioning
        ('RIGHTPADDING', (0,0), (-1,-1), 2*cm),
    ]))
    story.append(underline_table)
    story.append(Spacer(1, 8))

    # 4. Dual-Column Block (side-by-side)
    # Left block (≈8 cm wide): Exit dates
    exit_data = [
        [format_persian_text("خروج از دفتر:"), str(order.exit_from_office_date or '-')],
        [format_persian_text("خروج از کارخانه:"), str(order.exit_from_factory_date or '-')]
    ]
    exit_table = Table(exit_data, colWidths=[3*cm, 5*cm])
    exit_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))

    # Right block (≈8 cm wide): Dimensions
    dims_data = [
        [format_persian_text("تراکم"), format_persian_text("عرض"), 
         format_persian_text("طول"), format_persian_text("برش")],
        [str(order.fabric_density or '-'), str(order.width or '-'),
         str(order.height or '-'), str(order.fabric_cut or '-')]
    ]
    dims_table = Table(dims_data, colWidths=[2*cm, 2*cm, 2*cm, 2*cm])
    dims_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))

    # Combine left and right blocks side-by-side
    dual_column = Table([[exit_table, dims_table]], colWidths=[8*cm, 8*cm])
    dual_column.setStyle(TableStyle([
        ('VALIGN', (0,0), (1,0), 'TOP'),
        ('LEFTPADDING', (0,0), (1,0), 0),
        ('RIGHTPADDING', (0,0), (1,0), 0),
    ]))
    story.append(dual_column)
    story.append(Spacer(1, 10))

    
     # 6. Quantity & Meterage Row
    # Line with تعداد, then small table with متر and عدد
    # First: تعداد line
    qty_line_style = ParagraphStyle(
        'QuantityLine',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=4
    )
    story.append(Paragraph(format_persian_text(f"تعداد:"), qty_line_style))
    
    # Second: Small table with متر and عدد
    qty_table_data = [
        [format_persian_text("متر:"), str(order.total_length_meters or '-')],
        [format_persian_text("عدد:"), str(order.quantity or '-')]
    ]
    qty_table = Table(qty_table_data, colWidths=[3*cm, 3*cm])
    qty_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    story.append(qty_table)
    story.append(Spacer(1, 12))
    # 5. Customer-Note Textarea
    # Title above (right aligned): توضیحات مشتری به دفتر
    notes_title_style = ParagraphStyle(
        'NotesTitle',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=3
    )
    story.append(Paragraph(format_persian_text("توضیحات مشتری به دفتر"), notes_title_style))

    # Full-width box (≈16 cm × 4 cm), single border, no shading
    notes = order.customer_note_to_office or '-'
    notes_table = Table([[notes]], colWidths=[16*cm], rowHeights=[4*cm])
    notes_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,0), 'Vazir'),
        ('FONTSIZE', (0,0), (0,0), 10),
        ('ALIGN', (0,0), (0,0), 'RIGHT'),
        ('VALIGN', (0,0), (0,0), 'TOP'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('BOTTOMPADDING', (0,0), (0,0), 8),
        ('TOPPADDING', (0,0), (0,0), 8),
        ('LEFTPADDING', (0,0), (0,0), 8),
        ('RIGHTPADDING', (0,0), (0,0), 8),
        ('DIRECTION', (0,0), (0,0), 'RTL'),
    ]))
    story.append(notes_table)
    story.append(Spacer(1, 10))

   

    # 7. Values Table and Order Files Table (side by side)
    # Values table: 2 rows × 8 columns with headers 1-8
    values_headers = [str(i) for i in range(1, 9)]  # 1, 2, 3, 4, 5, 6, 7, 8
    values_data = [values_headers]
    
    # Get order values for the second row
    order_values = []
    for i in range(1, 9):
        value = OrderValue.query.filter_by(order_id=order.id, value_index=i).first()
        order_values.append(value.value if value else '-')
    values_data.append(order_values)
    
    values_table = Table(values_data, colWidths=[1.5*cm]*8)  # 8 equal columns, smaller
    values_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))

    # Order Files table: 9 rows × 2 columns with headers ردیف and فایل
    files_headers = [format_persian_text("ردیف"), format_persian_text("فایل")]
    files_data = [files_headers]
    
    # Get order files for the remaining rows
    order_files = OrderFile.query.filter_by(order_id=order.id).all()
    for i in range(8):  # 8 additional rows (total 9 rows)
        if i < len(order_files):
            file = order_files[i]
            files_data.append([format_persian_text(file.display_name or '-'), format_persian_text(file.file_name or '-')])
        else:
            files_data.append(['', ''])
    
    files_table = Table(files_data, colWidths=[1.5*cm, 4*cm])
    files_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))

    # Combine tables side by side
    combined_tables = Table([[values_table, files_table]], colWidths=[12*cm, 5.5*cm])
    combined_tables.setStyle(TableStyle([
        ('VALIGN', (0,0), (1,0), 'TOP'),
        ('LEFTPADDING', (0,0), (1,0), 0),
        ('RIGHTPADDING', (0,0), (1,0), 0),
    ]))
    story.append(combined_tables)
    
    # Office notes in corner
    office_notes_style = ParagraphStyle(
        'OfficeNotes',
        fontName='Vazir',
        fontSize=10,
        alignment=TA_RIGHT,
        spaceAfter=4
    )
    office_notes = order.office_notes or '-'
    story.append(Paragraph(format_persian_text(f"توضیحات دفتر به کارخانه: {office_notes}"), office_notes_style))
    story.append(Spacer(1, 12))

    # 8. چاپ و تکمیل (Print and Completion) Section
    # Section title
    completion_title_style = ParagraphStyle(
        'CompletionTitle',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=6
    )
    story.append(Paragraph(format_persian_text("چاپ و تکمیل"), completion_title_style))
    
    # Create checkboxes and options in columns with database-driven selections
    # آهار (Finish/Sizing)
    ahar_options = ["نرم", "متوسط", "خشک"]
    ahar_data = [[format_persian_text("آهار"), ""]]
    for option in ahar_options:
        # Check if this option matches the database value
        is_selected = order.fusing_type and option.lower() in order.fusing_type.lower()
        checkbox = "☑" if is_selected else "☐"
        ahar_data.append([format_persian_text(option), checkbox])
    
    ahar_table = Table(ahar_data, colWidths=[2.5*cm, 0.8*cm])
    ahar_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    
    # برش (Cut/Cutting)
    cut_options = ["برش مغل", "برش دانه ای (قطع)", "برش لیزر", "برش یک طرف زیاد"]
    cut_data = [[format_persian_text("برش"), ""]]
    for option in cut_options:
        # Check if this option matches the database value
        is_selected = order.cut_type and option.lower() in order.cut_type.lower()
        checkbox = "☑" if is_selected else "☐"
        cut_data.append([format_persian_text(option), checkbox])
    
    cut_table = Table(cut_data, colWidths=[2.5*cm, 0.8*cm])
    cut_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    
    # پرس (Press/Print)
    press_options = ["تاز وسط", "برجسته و براق", "قالب جدید", "براق"]
    press_data = [[format_persian_text("پرس"), ""]]
    for option in press_options:
        # Check if this option matches the database value
        is_selected = order.lamination_type and option.lower() in order.lamination_type.lower()
        checkbox = "☑" if is_selected else "☐"
        press_data.append([format_persian_text(option), checkbox])
    
    press_table = Table(press_data, colWidths=[2.5*cm, 0.8*cm])
    press_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    
    # چسب (Adhesive/Glue)
    glue_options = ["چسب حرارتی", "چسب دو طرفه", "لانی"]
    glue_data = [[format_persian_text("چسب"), ""]]
    for option in glue_options:
        # Check if this option matches the database value
        is_selected = order.label_type and option.lower() in order.label_type.lower()
        checkbox = "☑" if is_selected else "☐"
        glue_data.append([format_persian_text(option), checkbox])
    
    glue_table = Table(glue_data, colWidths=[2.5*cm, 0.8*cm])
    glue_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Vazir'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.5, black),
        ('BACKGROUND', (0,0), (-1,0), grey),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('DIRECTION', (0,0), (-1,-1), 'RTL'),
    ]))
    
    # Roll information
    # Add tables beside each other
    # Combine tables horizontally
    completion_tables = Table([[ahar_table, cut_table, press_table, glue_table]], 
                             colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
    completion_tables.setStyle(TableStyle([
        ('VALIGN', (0,0), (3,0), 'TOP'),
        ('LEFTPADDING', (0,0), (3,0), 0),
        ('RIGHTPADDING', (0,0), (3,0), 0),
    ]))
    story.append(completion_tables)
    story.append(Spacer(1, 12))
    
    # Add selected options as text with checkboxes
    selected_options = []
    
    # Check آهار options
    if order.fusing_type:
        for option in ahar_options:
            if option.lower() in order.fusing_type.lower():
                selected_options.append(f"☑️{option}")
    
    # Check برش options
    if order.cut_type:
        for option in cut_options:
            if option.lower() in order.cut_type.lower():
                selected_options.append(f"☑️{option}")
    
    # Check پرس options
    if order.lamination_type:
        for option in press_options:
            if option.lower() in order.lamination_type.lower():
                selected_options.append(f"☑️{option}")
    
    # Check چسب options
    if order.label_type:
        for option in glue_options:
            if option.lower() in order.label_type.lower():
                selected_options.append(f"☑️{option}")
    
    # Display selected options from database
    selected_values = []
    
    # Check آهار options
    if order.fusing_type:
        selected_values.append(f"☑️ آهار: {order.fusing_type}")
    
    # Check برش options
    if order.cut_type:
        selected_values.append(f"☑️ برش: {order.cut_type}")
    
    # Check پرس options
    if order.lamination_type:
        selected_values.append(f"☑️ پرس: {order.lamination_type}")
    
    # Check چسب options
    if order.label_type:
        selected_values.append(f"☑️ چسب: {order.label_type}")
    
    if selected_values:
        selected_text = " | ".join(selected_values)
        selected_style = ParagraphStyle(
            'SelectedOptions',
            fontName='Vazir',
            fontSize=10,
            alignment=TA_RIGHT,
            spaceAfter=6
        )
        story.append(Paragraph(format_persian_text(f"مقادیر انتخاب شده: {selected_text}"), selected_style))

    return story

def generate_machine_table(machines):
    """Generate machine data table for a specific shift"""
    story = []
    
    # Machine data table headers
    machine_headers = ['نام کارگر', 'تعداد شروع', 'ساعت شروع', 'تعداد مانده', 'ساعت مانده']
    machine_data_rows = [machine_headers]
    
    for machine in machines:
        machine_data_rows.append([
            machine.worker_name or '-',
            str(machine.starting_quantity) if machine.starting_quantity else '-',
            machine.start_time.strftime('%H:%M') if machine.start_time else '-',
            str(machine.remaining_quantity) if machine.remaining_quantity else '-',
            machine.end_time.strftime('%H:%M') if machine.end_time else '-'
        ])
    
    if len(machine_data_rows) == 1:  # Only headers
        machine_data_rows.append(['-', '-', '-', '-', '-'])
    
    machine_table = Table(machine_data_rows, colWidths=[3*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    machine_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, black),
        ('DIRECTION', (0, 0), (-1, -1), 'RTL')
    ]))
    story.append(machine_table)
    
    return story

def generate_job_metrics_section(order, job_metrics):
    """Generate شاخص کار section for page 1"""
    story = []
    
    # Add thick solid line above شاخص کار
    line_table = Table([['']], colWidths=[16*cm], rowHeights=[0.2*cm])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (0,0), 3, black),  # Thick solid line
    ]))
    story.append(line_table)
    story.append(Spacer(1, 4))
    
    # Job Metrics Tables - 5 tables next to each other
    story.append(Paragraph(format_persian_text("شاخص کار"), ParagraphStyle(
        'SectionTitle',
        parent=getSampleStyleSheet()['Heading2'],
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=5
    )))
    
    # Create 5 tables: 3 with تعداد بسته/مقدار بسته and 2 with تعداد رول/متراژ
    tables = []
    
    # First 3 tables: تعداد بسته and مقدار بسته
    for i in range(3):
        headers = [format_persian_text('تعداد بسته'), format_persian_text('مقدار بسته')]
        table_data = [headers]
        
        # Add 3 rows of data
        if job_metrics and len(job_metrics) > i:
            metric = job_metrics[i]
            table_data.append([
                str(metric.package_count) if metric.package_count else '-',
                str(metric.package_value) if metric.package_value else '-'
            ])
        else:
            table_data.append(['-', '-'])
        
        # Add 2 more empty rows
        for j in range(2):
            table_data.append(['-', '-'])
        
        table = Table(table_data, colWidths=[1.5*cm, 1.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, black),
            ('DIRECTION', (0, 0), (-1, -1), 'RTL')
        ]))
        tables.append(table)
    
    # Last 2 tables: تعداد رول and متراژ
    for i in range(2):
        headers = [format_persian_text('تعداد رول'), format_persian_text('متراژ')]
        table_data = [headers]
        
        # Add 3 rows of data
        if job_metrics and len(job_metrics) > i:
            metric = job_metrics[i]
            table_data.append([
                str(metric.roll_count) if metric.roll_count else '-',
                str(metric.meterage) if metric.meterage else '-'
            ])
        else:
            table_data.append(['-', '-'])
        
        # Add 2 more empty rows
        for j in range(2):
            table_data.append(['-', '-'])
        
        table = Table(table_data, colWidths=[1.5*cm, 1.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, black),
            ('DIRECTION', (0, 0), (-1, -1), 'RTL')
        ]))
        tables.append(table)
    
    # Combine all 5 tables horizontally with spacing
    combined_tables = Table([tables], colWidths=[3*cm, 3*cm, 3*cm, 3*cm, 3*cm])
    combined_tables.setStyle(TableStyle([
        ('VALIGN', (0,0), (4,0), 'TOP'),
        ('LEFTPADDING', (0,0), (4,0), 2),
        ('RIGHTPADDING', (0,0), (4,0), 2),
    ]))
    story.append(combined_tables)
    
    return story

def generate_page_two_content(order, job_metrics, production_steps):
    """Generate content for page 2: Machine data section"""
    story = []
    
    # Machine Data Section - Two tables side by side
    story.append(Paragraph(format_persian_text(" ماشین"), ParagraphStyle(
        'SectionTitle',
        parent=getSampleStyleSheet()['Heading2'],
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=5
    )))
    
    # Get machine data for this order
    from src.production.models import Machine
    machine_data = Machine.query.filter_by(order_id=order.id).all()
    
    # Separate data by shift type
    day_shift_data = []
    night_shift_data = []
    
    if machine_data:
        for machine in machine_data:
            if machine.shift_type and 'day' in machine.shift_type.value.lower():
                day_shift_data.append(machine)
            elif machine.shift_type and 'night' in machine.shift_type.value.lower():
                night_shift_data.append(machine)
    
    # Create table headers
    headers = [
        format_persian_text('تعداد شروع'),
        format_persian_text('ساعت شروع'),
        format_persian_text('تعداد مانده'),
        format_persian_text('ساعت مانده'),
        format_persian_text('نام کارگر')
    ]
    
    # Create بافت روز (Day Shift) table
    day_table_data = [headers]
    for i in range(7):  # 7 rows total
        if i < len(day_shift_data):
            machine = day_shift_data[i]
            day_table_data.append([
                str(machine.starting_quantity) if machine.starting_quantity else '-',
                machine.start_time.strftime('%H:%M') if machine.start_time else '-',
                str(machine.remaining_quantity) if machine.remaining_quantity else '-',
                machine.end_time.strftime('%H:%M') if machine.end_time else '-',
                format_persian_text(machine.worker_name or '-')
            ])
        else:
            day_table_data.append(['-', '-', '-', '-', '-'])
    
    day_table = Table(day_table_data, colWidths=[1.2*cm, 1.2*cm, 1.2*cm, 1.2*cm, 2*cm])
    day_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
        ('FONTSIZE', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('GRID', (0, 0), (-1, -1), 0.5, black),
        ('DIRECTION', (0, 0), (-1, -1), 'RTL')
    ]))
    
    # Create بافت شب (Night Shift) table
    night_table_data = [headers]
    for i in range(7):  # 7 rows total
        if i < len(night_shift_data):
            machine = night_shift_data[i]
            night_table_data.append([
                str(machine.starting_quantity) if machine.starting_quantity else '-',
                machine.start_time.strftime('%H:%M') if machine.start_time else '-',
                str(machine.remaining_quantity) if machine.remaining_quantity else '-',
                machine.end_time.strftime('%H:%M') if machine.end_time else '-',
                format_persian_text(machine.worker_name or '-')
            ])
        else:
            night_table_data.append(['-', '-', '-', '-', '-'])
    
    night_table = Table(night_table_data, colWidths=[1.2*cm, 1.2*cm, 1.2*cm, 1.2*cm, 2*cm])
    night_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
        ('FONTSIZE', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('GRID', (0, 0), (-1, -1), 0.5, black),
        ('DIRECTION', (0, 0), (-1, -1), 'RTL')
    ]))
    
    # Add table titles
    day_title = Paragraph(format_persian_text("بافت روز"), ParagraphStyle(
        'TableTitle',
        fontName='Vazir',
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=2
    ))
    night_title = Paragraph(format_persian_text("بافت شب"), ParagraphStyle(
        'TableTitle',
        fontName='Vazir',
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=2
    ))
    
    # Combine titles and tables side by side with right alignment
    combined_machine_tables = Table([
        [day_title, night_title],
        [day_table, night_table]
    ], colWidths=[8*cm, 8*cm])
    combined_machine_tables.setStyle(TableStyle([
        ('VALIGN', (0,0), (1,1), 'TOP'),
        ('LEFTPADDING', (0,0), (1,1), 0),
        ('RIGHTPADDING', (0,0), (1,1), 0),
        ('ALIGN', (0,0), (1,1), 'RIGHT'),  # Right align the entire table
    ]))
    story.append(combined_machine_tables)
    story.append(Spacer(1, 8))
    
    # Add مدت زمان تولید (Production Duration) section
    production_duration_title = Paragraph(format_persian_text("مدت زمان تولید"), ParagraphStyle(
        'ProductionDurationTitle',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=4
    ))
    story.append(production_duration_title)
    
    # Create empty space for user content
    duration_content = order.production_duration or '-'
    duration_table = Table([[duration_content]], colWidths=[16*cm], rowHeights=[4*cm])
    duration_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,0), 'Vazir'),
        ('FONTSIZE', (0,0), (0,0), 10),
        ('ALIGN', (0,0), (0,0), 'RIGHT'),
        ('VALIGN', (0,0), (0,0), 'TOP'),
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('BOTTOMPADDING', (0,0), (0,0), 8),
        ('TOPPADDING', (0,0), (0,0), 8),
        ('LEFTPADDING', (0,0), (0,0), 8),
        ('RIGHTPADDING', (0,0), (0,0), 8),
        ('DIRECTION', (0,0), (0,0), 'RTL'),
    ]))
    story.append(duration_table)
    story.append(Spacer(1, 8))
    
    # Add صدور فاکتور (Invoice Issuance) section
    invoice_title = Paragraph(format_persian_text("صدور فاکتور"), ParagraphStyle(
        'InvoiceTitle',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=4
    ))
    story.append(invoice_title)
    
    # Get actual invoice data from database
    from src.invoice.models import Payment
    payments = Payment.query.filter_by(order_id=order.id).all()
    
    # Create invoice data table with fixed 2 rows
    invoice_headers = [
        format_persian_text('کارت اعتباری'),
        format_persian_text('تعداد'),
        format_persian_text('قیمت واحد'),
        format_persian_text('هزینه برش'),
        format_persian_text('تعداد برش'),
        format_persian_text('تعداد اهار'),
        format_persian_text('تعداد پیک'),
        format_persian_text('عرض'),
        format_persian_text('فی'),
        format_persian_text('شماره فاکتور')
    ]
    
    invoice_data = [invoice_headers]
    
    # Add data row (exactly 1 row)
    if payments:
        payment = payments[0]  # Use the first payment
        invoice_data.append([
            format_persian_text(payment.credit_card or '-'),
            str(payment.quantity) if payment.quantity else '-',
            str(payment.unit_price) if payment.unit_price else '-',
            str(payment.cutting_cost) if payment.cutting_cost else '-',
            str(payment.number_of_cuts) if payment.number_of_cuts else '-',
            str(payment.number_of_density) if payment.number_of_density else '-',
            str(payment.peak_quantity) if payment.peak_quantity else '-',
            str(payment.peak_width) if payment.peak_width else '-',
            str(payment.Fee) if payment.Fee else '-',
            format_persian_text(payment.invoice_number or '-')
        ])
    else:
        # Add empty row if no payment data
        invoice_data.append(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'])
    
    invoice_table = Table(invoice_data, colWidths=[4*cm, 1.5*cm, 2*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 2.5*cm])
    invoice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Vazir'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, black),
        ('DIRECTION', (0, 0), (-1, -1), 'RTL')
    ]))
    story.append(invoice_table)
    story.append(Spacer(1, 8))
    
    # Add مراحل تولید (Production Steps) section
    production_steps_title = Paragraph(format_persian_text("مراحل تولید"), ParagraphStyle(
        'ProductionStepsTitle',
        fontName='Vazir',
        fontSize=12,
        alignment=TA_RIGHT,
        spaceAfter=4
    ))
    story.append(production_steps_title)
    
    # Get production step data from database
    production_steps = ProductionStepLog.query.filter_by(order_id=order.id).all()
    
    # Map production steps to their Persian names
    step_mapping = {
        'mongane': 'منگنه',
        'ahar': 'آهار', 
        'press': 'پرس',
        'bresh': 'برش'
    }
    
    # Create form-style production steps
    production_steps_style = ParagraphStyle(
        'ProductionSteps',
        fontName='Vazir',
        fontSize=10,
        alignment=TA_RIGHT,
        spaceAfter=6,
        spaceBefore=6
    )
    
    # Generate each production step line
    for step_name in ['mongane', 'ahar', 'press', 'bresh']:
        step_persian_name = step_mapping[step_name]
        
        # Find matching production step
        step_data = next((step for step in production_steps if step.step_name.value == step_name), None)
        
        if step_data:
            # Fill with actual data
            worker_name = step_data.worker_name or '..............'
            date = str(step_data.date) if step_data.date else '..............'
            quantity = str(step_data.member_count) if step_data.member_count else '..............'
            signature = '✓' if step_data else '..............'
        else:
            # Empty dotted lines
            worker_name = '..............'
            date = '..............'
            quantity = '..............'
            signature = '..............'
        
        # Create the line text with better spacing between fields
        step_line = f"{step_persian_name} : کارگر: {worker_name}                    تاریخ: {date}                    تعداد: {quantity}                    امضاء: {signature}"
        story.append(Paragraph(format_persian_text(step_line), production_steps_style))
    
    return story