import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Label } from '@uipath/apollo-wind/components/ui/label';
import { toast } from '@uipath/apollo-wind/components/ui/sonner';
import { STATUS } from '../lib/constants';
import type { Appointment, ClinicData, Doctor, Patient } from '../lib/df';
import { computeFreeSlots } from '../lib/slots';

export function BookAppointment({ data }: { data: ClinicData }) {
  const [nationalId, setNationalId] = useState('');
  const [patient, setPatient] = useState<Patient | undefined>();
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'notFound'>('idle');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!patient) return;
    void Promise.all([data.getDoctors(), data.getAppointments()]).then(([docs, appts]) => {
      setDoctors(docs);
      setAppointments(appts);
    });
  }, [patient, data]);

  const doctor = doctors.find((d) => d.doctorId === doctorId);
  const freeSlots = useMemo(
    () => (doctor && date ? computeFreeSlots(doctor, date, appointments) : []),
    [doctor, date, appointments],
  );

  const verify = async () => {
    setVerifyState('checking');
    setPatient(undefined);
    const found = await data.findPatientByNationalId(nationalId);
    if (found) {
      setPatient(found);
      setVerifyState('idle');
    } else {
      setVerifyState('notFound');
    }
  };

  const book = async () => {
    if (!patient || !doctor || !date || !time) return;
    setBooking(true);
    try {
      await data.bookAppointment({
        patientId: patient.patientId,
        patientEmail: patient.email,
        doctorId: doctor.doctorId,
        appointmentDate: date,
        appointmentTime: time,
        status: STATUS.booked,
        notes: `Booked via clinic portal (${doctor.name}, ${doctor.speciality})`,
      });
      toast.success(`Appointment booked for ${date} at ${time} with ${doctor.name}.`);
      setAppointments(await data.getAppointments());
      setTime('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verify Patient</CardTitle>
          <CardDescription>Enter your National ID to look up your patient record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="National ID"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />
            <Button onClick={verify} disabled={!nationalId.trim() || verifyState === 'checking'}>
              {verifyState === 'checking' ? 'Checking…' : 'Verify'}
            </Button>
          </div>
          {verifyState === 'notFound' && (
            <Alert variant="destructive">
              <AlertDescription>
                No patient found for that National ID. Please contact the front desk to register.
              </AlertDescription>
            </Alert>
          )}
          {patient && (
            <Alert>
              <AlertDescription>
                Verified: <span className="font-medium">{patient.name}</span> ({patient.email})
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {patient && (
        <Card>
          <CardHeader>
            <CardTitle>Book an Appointment</CardTitle>
            <CardDescription>
              Pick a doctor and a date — only free 30-minute slots are offered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setTime('');
                }}
              >
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.name} — {d.speciality} ({d.workingHoursStart}–{d.workingHoursEnd})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime('');
                }}
              />
            </div>
            {doctor && date && (
              <div className="space-y-2">
                <Label>Available time</Label>
                {freeSlots.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No free slots for {doctor.name} on {date}. Try another date or doctor.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <select
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  >
                    <option value="">Select a time…</option>
                    {freeSlots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <Button className="w-full" onClick={book} disabled={!doctor || !date || !time || booking}>
              {booking ? 'Booking…' : 'Book Appointment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
