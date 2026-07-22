import { NON_OCCUPYING_STATUSES, SLOT_MINUTES } from './constants';
import type { Appointment, Doctor } from './df';

/** Parse "HH:mm" into minutes since midnight, or undefined when malformed. */
function parseTime(value: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Client-side mirror of the SlotAllocator Coded Function's interval math:
 *  30-minute slots between the doctor's working hours, minus slots occupied
 *  by non-cancelled appointments for that doctor on that date. */
export function computeFreeSlots(
  doctor: Doctor,
  date: string,
  appointments: Appointment[],
): string[] {
  const start = parseTime(doctor.workingHoursStart);
  const end = parseTime(doctor.workingHoursEnd);
  if (start === undefined || end === undefined) return [];

  const occupied = new Set<number>();
  for (const a of appointments) {
    if (a.doctorId !== doctor.doctorId || a.appointmentDate !== date) continue;
    if (a.status !== undefined && NON_OCCUPYING_STATUSES.has(a.status)) continue;
    const t = parseTime(a.appointmentTime);
    if (t !== undefined) occupied.add(t);
  }

  const free: string[] = [];
  for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
    if (!occupied.has(t)) free.push(fmt(t));
  }
  return free;
}
