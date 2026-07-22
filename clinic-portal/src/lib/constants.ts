/** Data Fabric entity IDs — staging.uipath.com / vineethshenoy / Production. */
export const PATIENTS_ENTITY_ID = 'ceaa9e72-4a83-f111-b337-000d3ab0e5e5';
export const DOCTORS_ENTITY_ID = '389ca010-b185-f111-b337-000d3ab0e5e5';
export const APPOINTMENTS_ENTITY_ID = 'abc59879-4a83-f111-b337-000d3ab0e5e5';

/** AppointmentStatus choice set (id 80d367cd-b085-f111-b337-000d3ab0e5e5).
 *  NumberIds are immutable — mirror of ConsultationSystem/df_choice_set_map.json. */
export const STATUS = {
  booked: 0,
  checkedIn: 1,
  cancelledByPatient: 2,
  cancelledNoReply: 3,
  cancelledEmergency: 4,
  rescheduled: 5,
  completed: 6,
  abandoned: 7,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  0: 'Booked',
  1: 'Checked In',
  2: 'Cancelled by Patient',
  3: 'Cancelled (No Reply)',
  4: 'Cancelled (Emergency)',
  5: 'Rescheduled',
  6: 'Completed',
  7: 'Abandoned',
};

/** Statuses that do NOT occupy a slot on the doctor's calendar. */
export const NON_OCCUPYING_STATUSES = new Set<number>([2, 3, 4, 7]);

export const SLOT_MINUTES = 30;

export const BRAND_NAME = 'CarePoint Clinic';

/** Clinic mailbox monitored by the AgenticConsultationManagement flow's
 *  Gmail email-received trigger (label: ConsultationBooking). */
export const CLINIC_BOOKING_EMAIL = 'not.sir.but.good.at.it@gmail.com';
export const BOOKING_MAIL_SUBJECT = 'Book Consultation';
