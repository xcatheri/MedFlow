# constraints.py

def to_minutes(time_string):
    """Convert 'HH:MM' to minutes since midnight."""
    hours, minutes = map(int, time_string.split(":"))

    if not (0 <= hours < 24 and 0 <= minutes < 60):
        raise ValueError("Invalid time: " + time_string)

    return hours * 60 + minutes


def check_before_meal(dose_time, meal_time, min_minutes, max_minutes):
    """
    Check whether a dose is within the required window
    before a meal.
    """
    difference = meal_time - dose_time
    return min_minutes <= difference <= max_minutes


def check_with_meal(dose_time, routine, meal=None):
    """
    Check whether a dose coincides with a meal.

    meal=None or meal="any" means any meal is allowed.
    """

    if meal is not None and meal != "any":
        return dose_time == to_minutes(routine[meal])

    meal_times = [
        to_minutes(routine["breakfast"]),
        to_minutes(routine["lunch"]),
        to_minutes(routine["dinner"])
    ]

    return dose_time in meal_times


def check_separation(dose_time, other_time, min_minutes):
    """
    Check the minimum separation between two medications.
    """
    return abs(dose_time - other_time) >= min_minutes


def check_interval(dose_time, other_time, min_minutes):
    """
    Check the minimum interval between two doses
    of the same medication.
    """
    return abs(dose_time - other_time) >= min_minutes

def is_valid_dose(
    medication,
    dose_time,
    routine,
    scheduled_doses,
    medication_lookup
):
    """
    Check whether a proposed dose time satisfies all
    currently applicable timing constraints.

    medication: medication dictionary from medications.json
    dose_time: proposed time in minutes
    routine: dictionary of user's daily routine
    scheduled_doses: previously scheduled dose dictionaries
    medication_lookup: dictionary mapping medication IDs to data
    """

    medication_id = medication["id"]

    for constraint in medication["constraints"]:

        rule_type = constraint["type"]

        # 1. Before meal
        if rule_type == "before_meal":

            meal = constraint["meal"]
            meal_time = to_minutes(routine[meal])

            if not check_before_meal(
                dose_time,
                meal_time,
                constraint["minMinutes"],
                constraint["maxMinutes"]
            ):
                return False

        # 2. With meal
        elif rule_type == "with_meal":

            if not check_with_meal(
                dose_time,
                routine,
                constraint.get("meal")
            ):
                return False

        # 3. Minimum interval between doses of same medication
        elif rule_type == "interval":

            for scheduled in scheduled_doses:

                if scheduled["medicationId"] == medication_id:

                    if not check_interval(
                        dose_time,
                        scheduled["time"],
                        constraint["minMinutes"]
                    ):
                        return False

        # 4. Separation from another medication
        elif rule_type == "separation":

            other_id = constraint["medicationId"]

            for scheduled in scheduled_doses:

                if scheduled["medicationId"] == other_id:

                    if not check_separation(
                        dose_time,
                        scheduled["time"],
                        constraint["minMinutes"]
                    ):
                        return False

        # 5. Warnings don't affect schedule validity
        elif rule_type == "warning":
            continue

        else:
            raise ValueError(f"Unknown constraint: {rule_type}")

    # Check separation rules defined on previously scheduled
    # medications that refer to the medication we're placing.
    for scheduled in scheduled_doses:

        other_id = scheduled["medicationId"]
        other_medication = medication_lookup[other_id]

        for constraint in other_medication["constraints"]:

            if (
                constraint["type"] == "separation"
                and constraint["medicationId"] == medication_id
            ):
                if not check_separation(
                    dose_time,
                    scheduled["time"],
                    constraint["minMinutes"]
                ):
                    return False

    return True

def format_clock(minutes):
    """Minutes since midnight -> '7:30 AM' (matches what the app shows)."""
    hours, mins = divmod(minutes, 60)
    suffix = "AM" if hours < 12 else "PM"
    return f"{(hours + 11) % 12 + 1}:{mins:02d} {suffix}"


def separation_message(name_a, time_a, name_b, time_b, minimum):
    """Same text whichever medication the rule is read from."""
    (name_a, time_a), (name_b, time_b) = sorted(
        [(name_a, time_a), (name_b, time_b)]
    )
    return (
        f"{name_a} and {name_b} must be at least {minimum} minutes apart; "
        f"{name_a} at {format_clock(time_a)} is {abs(time_a - time_b)} "
        f"minutes from {name_b} at {format_clock(time_b)}."
    )


def explain_violations(
    medication,
    dose_time,
    routine,
    scheduled_doses,
    medication_lookup
):
    """
    Return plain-language reasons why a dose time breaks a rule.

    Mirrors is_valid_dose, but explains each broken rule instead of
    returning a bare False. An empty list means the dose is valid.
    """
    name = medication["name"]
    medication_id = medication["id"]
    reasons = []

    for constraint in medication["constraints"]:
        rule_type = constraint["type"]

        if rule_type == "before_meal":
            meal = constraint["meal"]
            diff = to_minutes(routine[meal]) - dose_time
            lo, hi = constraint["minMinutes"], constraint["maxMinutes"]
            if not check_before_meal(
                dose_time, to_minutes(routine[meal]), lo, hi
            ):
                where = (f"{diff} minutes before {meal}" if diff >= 0
                         else f"{-diff} minutes after {meal}")
                reasons.append(
                    f"{name} must be taken {lo} to {hi} minutes before "
                    f"{meal}; {format_clock(dose_time)} is {where}."
                )

        elif rule_type == "with_meal":
            meal = constraint.get("meal")
            if not check_with_meal(dose_time, routine, meal):
                if meal is not None and meal != "any":
                    reasons.append(
                        f"{name} must be taken with {meal} "
                        f"({format_clock(to_minutes(routine[meal]))})."
                    )
                else:
                    meals = ", ".join(
                        f"{m} {format_clock(to_minutes(routine[m]))}"
                        for m in ("breakfast", "lunch", "dinner")
                    )
                    reasons.append(
                        f"{name} must be taken with a meal "
                        f"({meals})."
                    )

        elif rule_type == "interval":
            for other in scheduled_doses:
                if other["medicationId"] == medication_id:
                    gap = abs(dose_time - other["time"])
                    if not check_interval(
                        dose_time, other["time"], constraint["minMinutes"]
                    ):
                        reasons.append(
                            f"{name} doses must be at least "
                            f"{constraint['minMinutes']} minutes apart; "
                            f"these are {gap} minutes apart."
                        )

        elif rule_type == "separation":
            other_id = constraint["medicationId"]
            for other in scheduled_doses:
                if other["medicationId"] == other_id:
                    gap = abs(dose_time - other["time"])
                    if not check_separation(
                        dose_time, other["time"], constraint["minMinutes"]
                    ):
                        other_name = medication_lookup[other_id]["name"]
                        reasons.append(separation_message(
                            name, dose_time, other_name, other["time"],
                            constraint["minMinutes"]
                        ))

    # Separation rules written on the *other* medication.
    for other in scheduled_doses:
        other_medication = medication_lookup[other["medicationId"]]
        for constraint in other_medication["constraints"]:
            if (
                constraint["type"] == "separation"
                and constraint["medicationId"] == medication_id
                and not check_separation(
                    dose_time, other["time"], constraint["minMinutes"]
                )
            ):
                reasons.append(separation_message(
                    name, dose_time, other_medication["name"], other["time"],
                    constraint["minMinutes"]
                ))

    # One message per problem, even when both medications list the rule.
    return list(dict.fromkeys(reasons))