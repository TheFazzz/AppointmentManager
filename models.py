from typing import List, Optional
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class CreateEventRequest(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime

class Event(BaseModel):
    event_id: int
    title: str
    description: str
    start_time: datetime
    end_time: datetime