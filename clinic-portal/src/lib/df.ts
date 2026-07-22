import type { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import type { EntityRecord } from '@uipath/uipath-typescript/entities';
import {
  PATIENTS_ENTITY_ID,
  DOCTORS_ENTITY_ID,
  APPOINTMENTS_ENTITY_ID,
} from './constants';

/** Read a field off an EntityRecord regardless of casing — Data Fabric read
 *  responses sometimes echo PascalCase keys while the schema is camelCase. */
export function field(record: Record<string, unknown>, name: string): unknown {
  if (name in record) return record[name];
  const pascal = name[0].toUpperCase() + name.slice(1);
  if (pascal in record) return record[pascal];
  return undefined;
}

export function fieldStr(record: Record<string, unknown>, name: string): string {
  const v = field(record, name);
  return v == null ? '' : String(v);
}

export function fieldNum(record: Record<string, unknown>, name: string): number | undefined {
  const v = field(record, name);
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/** Fetch EVERY record of an entity by walking the pagination cursor.
 *  A single getAllRecords() call returns only one server-capped page. */
async function fetchAllRecords(entities: Entities, entityId: string): Promise<EntityRecord[]> {
  const all: EntityRecord[] = [];
  let page = await entities.getAllRecords(entityId, { pageSize: 100 });
  all.push(...page.items);
  while ('hasNextPage' in page && page.hasNextPage && page.nextCursor) {
    page = await entities.getAllRecords(entityId, { pageSize: 100, cursor: page.nextCursor });
    all.push(...page.items);
  }
  return all;
}

export interface Doctor {
  id: string;
  doctorId: string;
  name: string;
  speciality: string;
  workingHoursStart: string;
  workingHoursEnd: string;
}

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientEmail: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: number | undefined;
  notes: string;
}

export class ClinicData {
  private entities: Entities;

  constructor(sdk: UiPath) {
    this.entities = new Entities(sdk);
  }

  async getDoctors(): Promise<Doctor[]> {
    const records = await fetchAllRecords(this.entities, DOCTORS_ENTITY_ID);
    return records.map((r) => ({
      id: fieldStr(r as Record<string, unknown>, 'Id'),
      doctorId: fieldStr(r as Record<string, unknown>, 'doctorId'),
      name: fieldStr(r as Record<string, unknown>, 'name'),
      speciality: fieldStr(r as Record<string, unknown>, 'speciality'),
      workingHoursStart: fieldStr(r as Record<string, unknown>, 'workingHoursStart'),
      workingHoursEnd: fieldStr(r as Record<string, unknown>, 'workingHoursEnd'),
    }));
  }

  async getPatients(): Promise<Patient[]> {
    const records = await fetchAllRecords(this.entities, PATIENTS_ENTITY_ID);
    return records.map((r) => ({
      id: fieldStr(r as Record<string, unknown>, 'Id'),
      patientId: fieldStr(r as Record<string, unknown>, 'patientId'),
      name: fieldStr(r as Record<string, unknown>, 'name'),
      email: fieldStr(r as Record<string, unknown>, 'email'),
      phone: fieldStr(r as Record<string, unknown>, 'phone'),
    }));
  }

  async findPatientByNationalId(nationalId: string): Promise<Patient | undefined> {
    const patients = await this.getPatients();
    return patients.find((p) => p.patientId === nationalId.trim());
  }

  async getAppointments(): Promise<Appointment[]> {
    const records = await fetchAllRecords(this.entities, APPOINTMENTS_ENTITY_ID);
    return records.map((r) => ({
      id: fieldStr(r as Record<string, unknown>, 'Id'),
      patientId: fieldStr(r as Record<string, unknown>, 'patientId'),
      patientEmail: fieldStr(r as Record<string, unknown>, 'patientEmail'),
      doctorId: fieldStr(r as Record<string, unknown>, 'doctorId'),
      appointmentDate: fieldStr(r as Record<string, unknown>, 'appointmentDate'),
      appointmentTime: fieldStr(r as Record<string, unknown>, 'appointmentTime'),
      status: fieldNum(r as Record<string, unknown>, 'status'),
      notes: fieldStr(r as Record<string, unknown>, 'notes'),
    }));
  }

  /** Insert a new patient. Field keys must match the DF schema verbatim (camelCase). */
  async registerPatient(p: { patientId: string; name: string; email: string; phone: string }) {
    return this.entities.insertRecordById(PATIENTS_ENTITY_ID, {
      patientId: p.patientId,
      name: p.name,
      email: p.email,
      phone: p.phone,
    });
  }

  /** Insert a new appointment (status = booked NumberId set by caller). */
  async bookAppointment(a: {
    patientId: string;
    patientEmail: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    status: number;
    notes: string;
  }) {
    return this.entities.insertRecordById(APPOINTMENTS_ENTITY_ID, { ...a });
  }

  /** Update a single appointment record (fires DF trigger events). */
  async updateAppointment(recordId: string, data: Record<string, unknown>) {
    return this.entities.updateRecordById(APPOINTMENTS_ENTITY_ID, recordId, data);
  }
}
