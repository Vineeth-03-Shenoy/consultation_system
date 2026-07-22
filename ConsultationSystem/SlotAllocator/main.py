from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel
from uipath.platform import UiPath
from uipath.tracing import traced

SLOT_MINUTES = 30
TIME_FMT = "%H:%M"

DOCTORS_ENTITY_ID = "389ca010-b185-f111-b337-000d3ab0e5e5"
APPOINTMENTS_ENTITY_ID = "abc59879-4a83-f111-b337-000d3ab0e5e5"

# AppointmentStatus choice-set NumberIds (see ConsultationSystem/df_choice_set_map.json).
# These statuses do NOT occupy a slot on the doctor's calendar.
NON_OCCUPYING_STATUSES = {2, 3, 4, 7}  # cancelled_by_patient, cancelled_no_reply, cancelled_emergency, abandoned


class Input(BaseModel):
    doctorId: str
    appointmentDate: str  # "YYYY-MM-DD"
    timePreference: Optional[str] = None  # free text hint: "14:30", "morning", "afternoon", etc.


class Output(BaseModel):
    success: bool = False
    selectedTime: Optional[str] = None
    reason: str = ""
    error_type: str = ""
    error_message: str = ""


_sdk: UiPath | None = None


def sdk() -> UiPath:
    global _sdk
    if _sdk is None:
        _sdk = UiPath()
    return _sdk


def _field(record: object, name: str) -> Optional[str]:
    """Read a field off an EntityRecord regardless of casing (API echoes PascalCase)."""
    value = getattr(record, name, None)
    if value is None:
        value = getattr(record, name[0].upper() + name[1:], None)
    return value


def _parse_time(value: str) -> Optional[datetime]:
    try:
        return datetime.strptime(value.strip(), TIME_FMT)
    except (ValueError, AttributeError):
        return None


def _preference_anchor(time_preference: Optional[str], day_start: datetime) -> Optional[datetime]:
    """Best-effort interpretation of a free-text time preference into an anchor time."""
    if not time_preference:
        return None
    text = time_preference.strip().lower()

    explicit = _parse_time(time_preference)
    if explicit is not None:
        return day_start.replace(hour=explicit.hour, minute=explicit.minute)

    if "morning" in text:
        return day_start.replace(hour=9, minute=0)
    if "afternoon" in text:
        return day_start.replace(hour=13, minute=0)
    if "evening" in text:
        return day_start.replace(hour=16, minute=0)

    return None


def _build_free_slots(
    working_start: datetime, working_end: datetime, occupied_starts: set[datetime]
) -> list[datetime]:
    slots: list[datetime] = []
    cursor = working_start
    step = timedelta(minutes=SLOT_MINUTES)
    while cursor + step <= working_end:
        if cursor not in occupied_starts:
            slots.append(cursor)
        cursor += step
    return slots


def _pick_slot(free_slots: list[datetime], anchor: Optional[datetime]) -> Optional[datetime]:
    if not free_slots:
        return None
    if anchor is None:
        return free_slots[0]
    return min(free_slots, key=lambda slot: abs((slot - anchor).total_seconds()))


@traced(name="allocate_slot", run_type="uipath")
def allocate_slot(input: Input) -> Output:
    out = Output()
    try:
        # NOTE: the platform SDK's list_records(filter=...) does not reliably narrow
        # results against this Data Fabric endpoint (verified empirically - a selective
        # filter still returned every row). Fetch and filter client-side instead; safe
        # at this data scale (single-clinic demo data).
        all_doctors = sdk().entities.list_records(DOCTORS_ENTITY_ID)
        doctors = [d for d in all_doctors if _field(d, "doctorId") == input.doctorId]
        if len(doctors) == 0:
            out.reason = f"No doctor found with ID '{input.doctorId}'."
            return out

        doctor = doctors[0]
        working_start_raw = _field(doctor, "workingHoursStart")
        working_end_raw = _field(doctor, "workingHoursEnd")

        day_start = datetime.strptime(input.appointmentDate, "%Y-%m-%d")
        working_start = _parse_time(working_start_raw)
        working_end = _parse_time(working_end_raw)
        if working_start is None or working_end is None:
            out.reason = f"Doctor '{input.doctorId}' has no valid working hours configured."
            return out

        working_start = day_start.replace(hour=working_start.hour, minute=working_start.minute)
        working_end = day_start.replace(hour=working_end.hour, minute=working_end.minute)

        all_appointments = sdk().entities.list_records(APPOINTMENTS_ENTITY_ID)
        appointments = [
            a
            for a in all_appointments
            if _field(a, "doctorId") == input.doctorId and _field(a, "appointmentDate") == input.appointmentDate
        ]

        occupied_starts: set[datetime] = set()
        for appt in appointments:
            status_value = _field(appt, "status")
            if status_value in NON_OCCUPYING_STATUSES:
                continue
            appt_time_raw = _field(appt, "appointmentTime")
            appt_time = _parse_time(appt_time_raw)
            if appt_time is not None:
                occupied_starts.add(day_start.replace(hour=appt_time.hour, minute=appt_time.minute))

        free_slots = _build_free_slots(working_start, working_end, occupied_starts)

        if not free_slots:
            out.reason = (
                f"No available slots on {input.appointmentDate} for doctor {input.doctorId} "
                f"(working hours {working_start_raw}-{working_end_raw} fully booked)."
            )
            return out

        anchor = _preference_anchor(input.timePreference, day_start)
        chosen = _pick_slot(free_slots, anchor)
        assert chosen is not None  # free_slots is non-empty here

        out.success = True
        out.selectedTime = chosen.strftime(TIME_FMT)
        if anchor is not None and chosen == anchor:
            out.reason = f"Selected {out.selectedTime}, matching your requested time."
        elif anchor is not None:
            out.reason = f"Selected {out.selectedTime}, nearest free slot to your {input.timePreference} preference."
        else:
            out.reason = f"Selected {out.selectedTime}, earliest available slot."
        return out

    except Exception as exc:  # noqa: BLE001 - contract requires errors returned, not raised
        out.error_type = type(exc).__name__
        out.error_message = str(exc)
        out.reason = "Slot allocation failed due to an internal error."
        return out
