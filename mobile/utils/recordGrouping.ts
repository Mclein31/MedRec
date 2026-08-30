import { MedicalRecord } from '../components/records/RecordRow';

export interface RecordSection {
  title: string;
  data: MedicalRecord[];
}

const TYPE_ORDER: Record<string, string> = {
  consultation: 'CONSULTATIONS',
  lab: 'LAB RESULTS',
  prescription: 'PRESCRIPTIONS',
  medication: 'MEDICATIONS',
  diagnosis: 'DIAGNOSES',
  appointment: 'APPOINTMENTS',
  other: 'GENERAL RECORDS',
};

export function groupRecords(
  records: MedicalRecord[],
  sortMode: string = 'recent'
): RecordSection[] {
  if (!records || records.length === 0) return [];

  // 1. GROUP BY CATEGORY
  if (sortMode === 'category') {
    const categoryGroups: Record<string, MedicalRecord[]> = {};
    const order: string[] = [];

    records.forEach((r) => {
      const typeKey = (r.type || 'other').toLowerCase();
      const heading = TYPE_ORDER[typeKey] || `${r.type.toUpperCase()}S`;
      if (!categoryGroups[heading]) {
        categoryGroups[heading] = [];
        order.push(heading);
      }
      categoryGroups[heading].push(r);
    });

    return order.map((title) => ({
      title,
      data: categoryGroups[title],
    }));
  }

  // 2. GROUP ALPHABETICALLY
  if (sortMode === 'alpha') {
    const sorted = [...records].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );
    const alphaGroups: Record<string, MedicalRecord[]> = {};
    const order: string[] = [];

    sorted.forEach((r) => {
      const firstChar = (r.title || '#').charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!alphaGroups[letter]) {
        alphaGroups[letter] = [];
        order.push(letter);
      }
      alphaGroups[letter].push(r);
    });

    return order.map((title) => ({
      title,
      data: alphaGroups[title],
    }));
  }

  // 3. CHRONOLOGICAL GROUPING (Recent or Oldest)
  const sorted = [...records].sort((a, b) => {
    const tA = new Date(a.date).getTime() || 0;
    const tB = new Date(b.date).getTime() || 0;
    return sortMode === 'oldest' ? tA - tB : tB - tA;
  });

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const groups: Record<string, MedicalRecord[]> = {};
  const order: string[] = [];

  sorted.forEach((record) => {
    let key = 'UNDATED RECORDS';
    if (record.date) {
      const d = new Date(record.date);
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();

        if (year === currentYear && month === currentMonth) {
          const monthName = d.toLocaleDateString('en-US', {
            month: 'long',
            timeZone: 'UTC',
          }).toUpperCase();
          key = `THIS MONTH (${monthName} ${year})`;
        } else if (year === currentYear) {
          const monthName = d.toLocaleDateString('en-US', {
            month: 'long',
            timeZone: 'UTC',
          }).toUpperCase();
          key = `${monthName} ${year}`;
        } else {
          key = `${year}`;
        }
      }
    }

    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(record);
  });

  return order.map((title) => ({
    title,
    data: groups[title],
  }));
}
