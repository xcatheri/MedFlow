import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import ScheduleRequest, ScheduleResponse
from models import EditScheduleRequest, EditScheduleResponse
from edits import apply_schedule_edit
from scheduler import create_schedule
from gemini_helper import explain_error

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
    lookup = {
        med["id"]: med
        for med in medication_data["medications"]
    }

    by_name = {
        med["name"].strip().casefold(): med
        for med in medication_data["medications"]
    }

    selected = []

    for med in request.medications:
        matched = by_name.get(med.name.strip().casefold())

        if matched is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown medication: {med.name}"
            )

        selected.append({
            "id": matched["id"],
            "dosesPerDay": med.dosesPerDay
        })

    try:
        edit = request.edit.model_dump()
        events = [e.model_dump() for e in request.events]
        routine = request.routine.model_dump()

        # Apply the proposed edit.
        result = apply_schedule_edit(
            edit,
            events,
            selected,
            routine,
            lookup
        )

        # If the medication edit is invalid,
        # ask Gemini to explain the conflict.
        if not result["success"] and edit["type"] == "medication":
            med_id = edit["medicationId"]
            dose_number = edit["doseNumber"]

            # Find the original dose.
            original = next(
                (
                    event for event in events
                    if event["medicationId"] == med_id
                    and event["doseNumber"] == dose_number
                ),
                None
            )

            if original:
                old_time = original["time"]

                # Suggest returning to the previous time.
                result["suggestedTime"] = old_time

                # Ask Gemini for a natural-language explanation.
                result["explanation"] = explain_error(
                    lookup[med_id]["name"],
                    edit["newTime"],
                    result["conflicts"],
                    old_time
                )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc
