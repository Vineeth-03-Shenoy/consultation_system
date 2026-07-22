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
import { Textarea } from '@uipath/apollo-wind/components/ui/textarea';
import { toast } from '@uipath/apollo-wind/components/ui/sonner';
import { NON_OCCUPYING_STATUSES, STATUS } from '../lib/constants';
import type { Appointment, ClinicData, Doctor } from '../lib/df';

export function DoctorEmergency({ data }: { data: ClinicData }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void Promise.all([data.getDoctors(), data.getAppointments()]).then(([docs, appts]) => {
      setDoctors(docs);
      setAppointments(appts);
    });
  }, [data]);

  const affected = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.doctorId === doctorId &&
          a.appointmentDate === date &&
          a.status !== undefined &&
          !NON_OCCUPYING_STATUSES.has(a.status) &&
          a.status !== STATUS.completed,
      ),
    [appointments, doctorId, date],
  );

  const declare = async () => {
    if (!doctorId || !date || !reason.trim() || affected.length === 0) return;
    setWorking(true);
    try {
      for (const a of affected) {
        await data.updateAppointment(a.id, {
          status: STATUS.cancelledEmergency,
          notes: `${a.notes ? a.notes + ' | ' : ''}Doctor emergency (${date}): ${reason.trim()}`,
        });
      }
      toast.success(`${affected.length} appointment(s) marked Cancelled (Emergency).`);
      setAppointments(await data.getAppointments());
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Declare Doctor Emergency</CardTitle>
          <CardDescription>
            Marks every active appointment for the selected doctor and date as Cancelled (Emergency).
            The consultation flow's emergency handling picks this up from Data Fabric.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Doctor</Label>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Select a doctor…</option>
              {doctors.map((d) => (
                <option key={d.doctorId} value={d.doctorId}>
                  {d.name} — {d.speciality}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. Doctor called away for a hospital emergency"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {doctorId && date && (
            <Alert variant={affected.length > 0 ? 'destructive' : 'default'}>
              <AlertDescription>
                {affected.length > 0
                  ? `${affected.length} active appointment(s) will be cancelled.`
                  : 'No active appointments for this doctor on this date.'}
              </AlertDescription>
            </Alert>
          )}
          <Button
            variant="destructive"
            className="w-full"
            onClick={declare}
            disabled={!doctorId || !date || !reason.trim() || affected.length === 0 || working}
          >
            {working ? 'Updating…' : 'Declare Emergency'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
