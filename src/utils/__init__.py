# Jalali date conversion utilities
import jdatetime
from datetime import datetime, date
from typing import Optional, Union

def jalali_to_gregorian(jalali_date_str: str) -> Optional[date]:
    """
    Convert Jalali date string (YYYY/MM/DD) to Gregorian date object.
    
    Args:
        jalali_date_str: Jalali date in format "YYYY/MM/DD" (e.g., "1404/05/21")
    
    Returns:
        Gregorian date object or None if conversion fails
    """
    if not jalali_date_str or jalali_date_str.strip() == '':
        return None
    
    try:
        # Parse Jalali date string
        parts = jalali_date_str.strip().split('/')
        if len(parts) != 3:
            return None
        
        jalali_year = int(parts[0])
        jalali_month = int(parts[1])
        jalali_day = int(parts[2])
        
        # Convert to Gregorian using jdatetime
        jalali_date = jdatetime.date(jalali_year, jalali_month, jalali_day)
        gregorian_date = jalali_date.togregorian()
        
        return gregorian_date
    except (ValueError, TypeError, AttributeError) as e:
        print(f"Error converting Jalali date '{jalali_date_str}': {e}")
        return None

def gregorian_to_jalali(gregorian_date: Union[date, datetime]) -> str:
    """
    Convert Gregorian date to Jalali date string.
    
    Args:
        gregorian_date: Gregorian date object or datetime object
    
    Returns:
        Jalali date string in format "YYYY/MM/DD"
    """
    if not gregorian_date:
        return ""
    
    try:
        if isinstance(gregorian_date, datetime):
            gregorian_date = gregorian_date.date()
        
        jalali_date = jdatetime.date.fromgregorian(date=gregorian_date)
        return f"{jalali_date.year:04d}/{jalali_date.month:02d}/{jalali_date.day:02d}"
    except Exception as e:
        print(f"Error converting Gregorian date '{gregorian_date}': {e}")
        return ""

def parse_date_input(date_str: str) -> Optional[date]:
    """
    Parse date input that could be either Jalali or Gregorian format.
    
    Args:
        date_str: Date string in either "YYYY/MM/DD" (Jalali) or "YYYY-MM-DD" (Gregorian) format
    
    Returns:
        Gregorian date object or None if parsing fails
    """
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = date_str.strip()
    
    # Check if it's Jalali format (contains '/')
    if '/' in date_str:
        return jalali_to_gregorian(date_str)
    
    # Check if it's Gregorian format (contains '-')
    elif '-' in date_str:
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return None
    
    return None 