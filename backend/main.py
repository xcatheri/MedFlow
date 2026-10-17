# FastAPI Endpoints

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ScheduleRequest(BaseModel):
    medications: list[str]
    breakfast: str
    lunch: str
    dinner: str
    sleep: str
    wakeup: str

@app.post("/schedule")
def generate_schedule(request: ScheduleRequest):
    return {
        "success": True,
        "message": "Schedule generated successfully",
        "medications": request.medications,
        "breakfast": request.breakfast,
        "lunch": request.lunch,
        "dinner": request.dinner,
        "sleep": request.sleep,
        "wakeup": request.wakeup
    }