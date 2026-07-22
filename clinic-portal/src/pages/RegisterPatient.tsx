import { useState } from 'react';
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
import type { ClinicData } from '../lib/df';

export function RegisterPatient({ data }: { data: ClinicData }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = firstName.trim() && nationalId.trim() && email.trim();

  const save = async () => {
    setSaving(true);
    try {
      const existing = await data.findPatientByNationalId(nationalId);
      if (existing) {
        toast.error(`A patient with National ID ${nationalId.trim()} already exists (${existing.name}).`);
        return;
      }
      await data.registerPatient({
        patientId: nationalId.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      toast.success(`Patient ${firstName} registered.`);
      setFirstName('');
      setLastName('');
      setNationalId('');
      setEmail('');
      setPhone('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Register New Patient</CardTitle>
          <CardDescription>Create a patient record in the clinic system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>National ID</Label>
            <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button className="w-full" onClick={save} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Register Patient'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
