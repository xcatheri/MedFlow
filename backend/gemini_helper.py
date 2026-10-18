
import os
from google import genai


def explain_error(medication, attempted_time,
                  conflicts, suggested_time):

    # Remove exact duplicate errors.
    unique_conflicts = list(dict.fromkeys(conflicts))

    fallback = " ".join(unique_conflicts)

    if not fallback:
        fallback = "The proposed time violates a scheduling constraint."

    if suggested_time:
        fallback += f" Previous scheduled time: {suggested_time}."

    if not os.getenv("GEMINI_API_KEY"):
        return fallback

    try:
        client = genai.Client()

        prompt = f"""
You are MedFlow's concise scheduling explanation assistant.

This is a fictional medication scheduling demo.

Medication: {medication}
Attempted time: {attempted_time}
Unique validation errors: {unique_conflicts}
Previously valid time: {suggested_time}

Instructions:
- Explain each unique conflict exactly once.
- Never copy the same error twice.
- Convert duration values to hours and minutes.
- For example, 240 minutes = 4 hours;
  225 minutes = 3 hours and 45 minutes.
- Use concise, natural language.
- Use no more than two sentences.
- Do not use bullet points or headings.
- Mention the previous time only if useful.
- Do not invent any medication rules or advice.
- Do not propose a time that wasn't validated.
- Do not claim medical safety.

Return only the explanation.
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text.strip() if response.text else fallback

    except Exception as exc:
        print("Gemini error:", exc)
        return fallback
