export interface MedicalRecord {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  attachment_url?: string | null;
  attachmentUrl?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecordSection {
  title: string;
  data: MedicalRecord[];
}
