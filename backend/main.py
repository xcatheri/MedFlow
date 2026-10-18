import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import ScheduleRequest, ScheduleResponse
from models import EditScheduleRequest, EditScheduleResponse
from edits import apply_schedule_edit
from scheduler import create_schedule

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

DATA_FILE = Path(__file__).parent / "medications.json"

with open(DATA_FILE, "r") as file:
    medication_data = json.load(file)


@app.get("/medications")
def get_medications():
    return medication_data


@app.post("/schedule", response_model=ScheduleResponse)
def generate_schedule(request: ScheduleRequest):
    medication_lookup = {
        med["name"].strip().casefold(): med
        for med in medication_data["medications"]
    }

    for selected in request.medications:
        if selected.name.strip().casefold() not in medication_lookup:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown medication: {selected.name}"
            )

    lookup = {med["id"]: med for med in medication_data["medications"]}
    selected = [
        {"id": medication_lookup[item.name.strip().casefold()]["id"],
         "dosesPerDay": item.dosesPerDay}
        for item in request.medications
    ]
    try:
        return create_schedule(selected, request.routine.model_dump(), lookup)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
@app.post("/edit-schedule", response_model=EditScheduleResponse)
def edit_schedule(request: EditScheduleRequest):
    lookup = {med["id"]: med for med in medication_data["medications"]}
    by_name = {med["name"].strip().casefold(): med
               for med in medication_data["medications"]}
    selected = []
    for med in request.medications:
        matched = by_name.get(med.name.strip().casefold())
        if matched is None:
            raise HTTPException(status_code=400,
                                detail=f"Unknown medication: {med.name}")
        selected.append({"id": matched["id"], "dosesPerDay": med.dosesPerDay})
    try:
        return apply_schedule_edit(
            request.edit.model_dump(),
            [event.model_dump() for event in request.events],
            selected,
            request.routine.model_dump(),
            lookup,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc