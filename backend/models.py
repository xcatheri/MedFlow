from typing import Literal, Optional
from pydantic import BaseModel, Field
from typing import List


class SelectedMedication(BaseModel):
    name: str
    dosesPerDay: int = Field(ge=1, le=4)


class DailyRoutine(BaseModel):
    wakeUp: str
    breakfast: str
    lunch: str
    dinner: str
    bedTime: str


class ScheduleRequest(BaseModel):
    medications: List[SelectedMedication]
    routine: DailyRoutine


class ScheduleEvent(BaseModel):
    medicationId: str
    doseNumber: int
    time: str
    reason: str


class ScheduleResponse(BaseModel):
    success: bool
    events: List[ScheduleEvent]
    conflicts: List[str]

class EditOperation(BaseModel):
    type: Literal["meal", "sleep", "medication"]
    newTime: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    event: Optional[str] = None  # e.g. breakfast, bedTime
    medicationId: Optional[str] = None
    doseNumber: Optional[int] = Field(default=None, ge=1)


class EditScheduleRequest(ScheduleRequest):
    edit: EditOperation
    events: List[ScheduleEvent] = Field(default_factory=list)

class EditScheduleResponse(ScheduleResponse):
    routine: DailyRoutine