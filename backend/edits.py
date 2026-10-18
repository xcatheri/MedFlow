"""Stage 1 MedFlow schedule edits (single-day, fictional rules only)."""

from collections import Counter

from constraints import is_valid_dose, to_minutes
from scheduler import create_schedule, explain_dose

MEALS = ("breakfast", "lunch", "dinner")
SLEEP_FIELDS = ("wakeUp", "bedTime")


def check_routine(routine):
    """Raise ValueError for unsupported/invalid single-day routines."""
    try:
        clock = {key: to_minutes(routine[key])
                 for key in ("wakeUp", *MEALS, "bedTime")}
    except (KeyError, TypeError, AttributeError, ValueError) as exc:
        raise ValueError("Routine must contain valid HH:MM times") from exc

    if not (clock["wakeUp"] < clock["breakfast"] <
            clock["lunch"] < clock["dinner"] < clock["bedTime"]):
        raise ValueError(
            "Expected wakeUp < breakfast < lunch < dinner < bedTime "
            "for the single-day demo"
        )
    return clock


def check_complete_schedule(events, selected_medications, routine, lookup):
    """Return a list of problems; empty list means all modeled rules pass."""
    clock = check_routine(routine)
    expected = {m["id"]: m["dosesPerDay"] for m in selected_medications}
    problems = []
    seen = set()
    counts = Counter()
    numeric_events = []

    for event in events:
        med_id = event["medicationId"]
        number = event["doseNumber"]
        if med_id not in expected:
            problems.append(f"Unexpected medication ID: {med_id}")
            continue
        if not isinstance(number, int) or isinstance(number, bool) or not 1 <= number <= expected[med_id]:
            problems.append(f"Invalid dose number for {lookup[med_id]['name']}")
            continue
        key = (med_id, number)
        if key in seen:
            problems.append(f"Duplicate dose {number} of {lookup[med_id]['name']}")
            continue
        seen.add(key)
        counts[med_id] += 1
        try:
            time = to_minutes(event["time"])
        except (ValueError, TypeError, AttributeError, KeyError):
            problems.append(f"Invalid time for {lookup[med_id]['name']} dose {number}")
            continue
        if not clock["wakeUp"] <= time <= clock["bedTime"]:
            problems.append(f"{lookup[med_id]['name']} dose {number} is outside waking hours")
        numeric_events.append({"medicationId": med_id, "doseNumber": number, "time": time})

    for med_id, count in expected.items():
        if counts[med_id] != count:
            problems.append(f"Expected {count} doses of {lookup[med_id]['name']}; got {counts[med_id]}")

    if problems:
        return problems

    # Keep dose 1 before dose 2 in the UI. Swapping two doses requires
    # editing both, or regenerating, rather than silently relabeling them.
    for med_id in expected:
        doses = sorted((e for e in numeric_events if e["medicationId"] == med_id),
                       key=lambda e: e["doseNumber"])
        if any(a["time"] >= b["time"] for a, b in zip(doses, doses[1:])):
            problems.append(f"Dose numbers for {lookup[med_id]['name']} must be in time order")

    # Check each dose against *all* other doses so one-way separation
    # rules are enforced regardless of which medication was edited.
    for idx, event in enumerate(numeric_events):
        others = [
            {"medicationId": other["medicationId"], "time": other["time"]}
            for j, other in enumerate(numeric_events) if j != idx
        ]
        if not is_valid_dose(
            lookup[event["medicationId"]], event["time"], routine, others, lookup
        ):
            name = lookup[event["medicationId"]]["name"]
            problems.append(
                f"{name} dose {event['doseNumber']} violates a meal, interval, "
                "or medication-separation rule"
            )
    return problems


def apply_schedule_edit(edit, events, selected_medications, routine, lookup):
    """Return success/events/conflicts/routine for a one-day schedule edit.

    Invalid edits leave the original event list and routine unchanged.
    """
    check_routine(routine)
    original_events = [dict(e) for e in events]
    original_routine = dict(routine)
    kind = edit["type"]
    new_time = edit["newTime"]
    # Validate newTime before using it (the API model also checks HH:MM).
    to_minutes(new_time)

    if kind in ("meal", "sleep"):
        field = edit.get("event")
        allowed = MEALS if kind == "meal" else SLEEP_FIELDS
        if field not in allowed:
            raise ValueError(f"For {kind} edits, event must be one of: {', '.join(allowed)}")

        changed_routine = dict(routine)
        changed_routine[field] = new_time
        try:
            check_routine(changed_routine)
        except ValueError as exc:
            return {"success": False, "events": original_events,
                    "conflicts": [str(exc)], "routine": original_routine}

        result = create_schedule(selected_medications, changed_routine, lookup)
        if not result["success"]:
            return {"success": False, "events": original_events,
                    "conflicts": result["conflicts"], "routine": original_routine}
        return {"success": True, "events": result["events"],
                "conflicts": [], "routine": changed_routine}

    if kind == "medication":
        med_id = edit.get("medicationId")
        number = edit.get("doseNumber")
        if med_id is None or number is None:
            raise ValueError("Medication edits require medicationId and doseNumber")

        edited_events = [dict(e) for e in events]
        targets = [e for e in edited_events
                   if e["medicationId"] == med_id and e["doseNumber"] == number]
        if len(targets) != 1:
            message = ("Duplicate target dose" if len(targets) > 1
                       else "Target dose not found")
            return {"success": False, "events": original_events,
                    "conflicts": [message], "routine": original_routine}

        targets[0]["time"] = new_time
        problems = check_complete_schedule(
            edited_events, selected_medications, routine, lookup
        )
        if problems:
            return {"success": False, "events": original_events,
                    "conflicts": problems, "routine": original_routine}

        for event in edited_events:
            med = lookup[event["medicationId"]]
            event["reason"] = explain_dose(med, to_minutes(event["time"]), routine)
        edited_events.sort(key=lambda e: (to_minutes(e["time"]), e["medicationId"]))
        return {"success": True, "events": edited_events,
                "conflicts": [], "routine": original_routine}

    raise ValueError(f"Unsupported edit type: {kind}")
