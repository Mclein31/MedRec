export const RECORD_TYPE_ASSETS: Record<string, any> = {
  consultation: require('../assets/icons/consultation.png'),
  diagnosis: require('../assets/icons/diagnosis.png'),
  lab: require('../assets/icons/lab.png'),
  prescription: require('../assets/icons/prescription.png'),
  medication: require('../assets/icons/prescription.png'),
  appointment: require('../assets/icons/calendar.png'),
  other: require('../assets/icons/folder.png'),
};

export const RECORD_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  diagnosis: 'Diagnosis',
  lab: 'Lab Result',
  prescription: 'Prescription',
  medication: 'Medication',
  appointment: 'Appointment',
  other: 'General Record',
};

export const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'lab', label: 'Labs' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'consultation', label: 'Consultations' },
  { key: 'diagnosis', label: 'Diagnoses' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'medication', label: 'Medications' },
  { key: 'other', label: 'Other' },
] as const;

export const RECORD_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'lab', label: 'Lab' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'medication', label: 'Medication' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'other', label: 'Other' },
] as const;
