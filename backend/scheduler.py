# scheduler.py

from constraints import is_valid_dose, to_minutes


def to_time(minutes):
    """Convert minutes since midnight to HH:MM."""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def generate_candidates(routine):
    """
    Generate possible dose times every 15 minutes
    between waking up and going to bed.
    Also include exact meal times.
    """
    start = to_minutes(routine["wakeUp"])
    end = to_minutes(routine["bedTime"])

    if start >= end:
        raise ValueError("Overnight routines are not supported yet")

    candidates = set(range(start, end + 1, 15))

    for meal in ("breakfast", "lunch", "dinner"):
        meal_time = to_minutes(routine[meal])

        if not start <= meal_time <= end:
            raise ValueError(f"{meal} must be during waking hours")

        candidates.add(meal_time)

    return sorted(candidates)


def create_dose_events(selected_medications):
    """
    Create one event for every requested daily dose.

    Example: 2 doses of Medication B produces
    B dose 1 and B dose 2.
    """
    events = []

    for medication in selected_medications:
        for dose_number in range(1, medication["dosesPerDay"] + 1):
            events.append({
                "medicationId": medication["id"],
                "doseNumber": dose_number
            })

    return events


def preferred_time(medication, dose_number, routine):
    """
    Choose a convenient preferred time.

    This affects candidate ordering only.
    Hard constraints are always checked separately.
    """
    meal_names = ["breakfast", "lunch", "dinner"]

    for rule in medication["constraints"]:
        if rule["type"] == "before_meal":
            meal_time = to_minutes(routine[rule["meal"]])
            return meal_time - rule["minMinutes"]

        if rule["type"] == "with_meal":
            meal = rule.get("meal", "any")

            if meal != "any":
                return to_minutes(routine[meal])

            # Spread multiple doses over different meals.
            index = min(dose_number - 1, len(meal_names) - 1)
            return to_minutes(routine[meal_names[index]])

    # Default convenience preferences for unconstrained doses.
    preferences = [
        routine["breakfast"],
        routine["dinner"],
        routine["lunch"]
    ]

    index = min(dose_number - 1, len(preferences) - 1)
    return to_minutes(preferences[index])


def explain_dose(medication, dose_time, routine):
    """Generate a human-readable explanation."""
    reasons = []

    for rule in medication["constraints"]:
        rule_type = rule["type"]

        if rule_type == "before_meal":
            meal = rule["meal"]
            difference = to_minutes(routine[meal]) - dose_time
            reasons.append(f"{difference} minutes before {meal}")

        elif rule_type == "with_meal":
            for meal in ("breakfast", "lunch", "dinner"):
                if dose_time == to_minutes(routine[meal]):
                    reasons.append(f"With {meal}")
                    break

        elif rule_type == "interval":
            reasons.append(
                f"At least {rule['minMinutes']} minutes "
                "between doses"
            )

        elif rule_type == "separation":
            reasons.append(
                f"Separated from medication "
                f"{rule['medicationId']} by at least "
                f"{rule['minMinutes']} minutes"
            )

    if not reasons:
        return "Selected based on the daily routine"

    return "; ".join(reasons)


def create_schedule(selected_medications, routine, medication_lookup):
    """
    Generate a daily medication schedule.

    selected_medications:
        [{"id": "001", "dosesPerDay": 1}, ...]

    routine:
        {"wakeUp": "06:00", "breakfast": "08:00", ...}

    medication_lookup:
        {"001": {...}, "002": {...}}
    """

    if not selected_medications:
        return {
            "success": False,
            "events": [],
            "conflicts": ["No medications selected"]
        }

    selected_ids = [med["id"] for med in selected_medications]

    if len(selected_ids) != len(set(selected_ids)):
        raise ValueError("Duplicate medication selections")

    for selected in selected_medications:
        if selected["id"] not in medication_lookup:
            raise ValueError(f"Unknown medication: {selected['id']}")

    candidates = generate_candidates(routine)
    dose_events = create_dose_events(selected_medications)

    # Precompute valid candidates for each dose event.
    for event in dose_events:
        medication = medication_lookup[event["medicationId"]]

        valid_times = [
            time for time in candidates
            if is_valid_dose(
                medication,
                time,
                routine,
                [],
                medication_lookup
            )
        ]

        preference = preferred_time(
            medication,
            event["doseNumber"],
            routine
        )

        valid_times.sort(key=lambda t: (abs(t - preference), t))
        event["candidates"] = valid_times

    # Schedule the most constrained events first.
    dose_events.sort(
        key=lambda event: (
            len(event["candidates"]),
            event["medicationId"],
            event["doseNumber"]
        )
    )

    scheduled = []

    def backtrack(index):
        if index == len(dose_events):
            return True

        event = dose_events[index]
        medication = medication_lookup[event["medicationId"]]

        for candidate_time in event["candidates"]:
            if not is_valid_dose(
                medication,
                candidate_time,
                routine,
                scheduled,
                medication_lookup
            ):
                continue

            scheduled.append({
                "medicationId": event["medicationId"],
                "doseNumber": event["doseNumber"],
                "time": candidate_time
            })

            if backtrack(index + 1):
                return True

            # Undo the choice and try another time.
            scheduled.pop()

        return False

    if not backtrack(0):
        return {
            "success": False,
            "events": [],
            "conflicts": [
                "No schedule satisfies all defined timing constraints"
            ]
        }

    # Put the final schedule in chronological order.
    scheduled.sort(key=lambda event: event["time"])

    # Number each medication's doses chronologically.
    dose_counts = {}

    for event in scheduled:
        med_id = event["medicationId"]
        dose_counts[med_id] = dose_counts.get(med_id, 0) + 1
        event["doseNumber"] = dose_counts[med_id]

    result_events = []

    for event in scheduled:
        medication = medication_lookup[event["medicationId"]]

        result_events.append({
            "medicationId": event["medicationId"],
            "doseNumber": event["doseNumber"],
            "time": to_time(event["time"]),
            "reason": explain_dose(
                medication,
                event["time"],
                routine
            )
        })

    return {
        "success": True,
        "events": result_events,
        "conflicts": []
    }