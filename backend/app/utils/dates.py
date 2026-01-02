from datetime import datetime, timedelta
from typing import Optional


def add_business_days(start_date: datetime, days: float) -> datetime:
    """Add business days to a date (assuming 5-day work week)"""
    # Simple implementation: multiply by 7/5 to convert calendar days to business days
    calendar_days = days * (7 / 5)
    return start_date + timedelta(days=calendar_days)


def days_between(start_date: datetime, end_date: datetime) -> float:
    """Calculate business days between two dates"""
    delta = end_date - start_date
    calendar_days = delta.total_seconds() / 86400
    # Convert to business days
    business_days = calendar_days * (5 / 7)
    return business_days


def parse_datetime(date_str: str) -> datetime:
    """Parse datetime string to datetime object"""
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return datetime.fromisoformat(date_str)

