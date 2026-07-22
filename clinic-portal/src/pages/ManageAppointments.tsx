import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog';
import { Input } from '@uipath/apollo-wind/components/ui/input';
import { Label } from '@uipath/apollo-wind/components/ui/label';
import { toast } from '@uipath/apollo-wind/components/ui/sonner';
import { NON_OCCUPYING_STATUSES, STATUS, STATUS_LABELS } from '../lib/constants';
import type { Appointment, ClinicData, Doctor } from '../lib/df';
import { computeFreeSlots } from '../lib/slots';

const PAGE_SIZE = 25;

export function ManageAppointments({ data }: { data: ClinicData }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, docs] = await Promise.all([data.getAppointments(), data.getDoctors()]);
      // Newest date first for an operational view.
      appts.sort((a, b) => (b.appointmentDate + b.appointmentTime).localeCompare(a.appointmentDate + a.appointmentTime));
      setAppointments(appts);
      setDoctors(docs);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(appointments.length / PAGE_SIZE));
  const pageRows = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const newDoctor = doctors.find((d) => d.doctorId === newDoctorId);
  const freeSlots = useMemo(
    () => (newDoctor && newDate ? computeFreeSlots(newDoctor, newDate, appointments) : []),
    [newDoctor, newDate, appointments],
  );

  const cancel = async (a: Appointment) => {
    setWorking(true);
    try {
      await data.updateAppointment(a.id, { status: STATUS.cancelledByPatient });
      toast.success(`Appointment for patient ${a.patientId} cancelled.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setWorking(false);
    }
  };

  const reschedule = async () => {
    if (!reschedTarget || !newDoctor || !newDate || !newTime) return;
    setWorking(true);
    try {
      await data.updateAppointment(reschedTarget.id, {
        status: STATUS.rescheduled,
        doctorId: newDoctor.doctorId,
        appointmentDate: newDate,
        appointmentTime: newTime,
      });
      toast.success(`Rescheduled to ${newDate} at ${newTime} with ${newDoctor.name}.`);
      setReschedTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setWorking(false);
    }
  };

  const statusVariant = (s: number | undefined): 'default' | 'secondary' | 'destructive' => {
    if (s === undefined) return 'secondary';
    if (NON_OCCUPYING_STATUSES.has(s)) return 'destructive';
    if (s === STATUS.completed) return 'secondary';
    return 'default';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>
          {loading
            ? 'Loading…'
            : `Showing ${appointments.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, appointments.length)} of ${appointments.length}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2">Patient</th>
                <th className="px-2 py-2">Doctor</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="max-w-40 truncate px-2 py-2" title={a.patientEmail}>
                    {a.patientId}
                  </td>
                  <td className="px-2 py-2">{a.doctorId}</td>
                  <td className="px-2 py-2">{a.appointmentDate}</td>
                  <td className="px-2 py-2">{a.appointmentTime}</td>
                  <td className="px-2 py-2">
                    <Badge variant={statusVariant(a.status)}>
                      {a.status !== undefined ? (STATUS_LABELS[a.status] ?? a.status) : '—'}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right">
                    {a.status !== undefined && !NON_OCCUPYING_STATUSES.has(a.status) && a.status !== STATUS.completed && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={working}
                          onClick={() => {
                            setReschedTarget(a);
                            setNewDoctorId(a.doctorId);
                            setNewDate(a.appointmentDate);
                            setNewTime('');
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button variant="destructive" size="sm" disabled={working} onClick={() => cancel(a)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </CardContent>

      <Dialog open={reschedTarget !== null} onOpenChange={(open) => !open && setReschedTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Patient {reschedTarget?.patientId} — currently {reschedTarget?.appointmentDate} at{' '}
              {reschedTarget?.appointmentTime}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={newDoctorId}
                onChange={(e) => {
                  setNewDoctorId(e.target.value);
                  setNewTime('');
                }}
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
              <Label>New date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setNewTime('');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>New time</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              >
                <option value="">Select a time…</option>
                {freeSlots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedTarget(null)}>
              Close
            </Button>
            <Button onClick={reschedule} disabled={!newDoctor || !newDate || !newTime || working}>
              {working ? 'Saving…' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
