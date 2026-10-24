import { Page } from './layout';
import { age, formatDate } from './share';

export interface EmergencyProps {
  name: string;
  dateOfBirth: string | null;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  organDonor: boolean | null;
  contact: { name: string | null; phone: string | null; relation: string | null };
  now: Date;
}

function List(props: { items: string[]; empty: string; alert?: boolean }) {
  if (!props.items.length) return <p class="muted">{props.empty}</p>;
  return (
    <div class="chips">
      {props.items.map((i) => (
        <span class={props.alert ? 'chip alert' : 'chip'}>{i}</span>
      ))}
    </div>
  );
}

/** Public Medical ID. Only the emergency facts the patient chose — never records or notes. */
export function EmergencyPage(p: EmergencyProps) {
  const years = age(p.dateOfBirth, p.now);
  const tel = p.contact.phone?.replace(/[^\d+]/g, '');
  return (
    <Page title={`Medical ID · ${p.name}`}>
      <div class="bar">
        <span class="brand" style="color:var(--danger)">✚ Medical ID</span>
        <span class="muted small">MedRec</span>
      </div>
      <h1>{p.name}</h1>
      <p class="muted">{[years !== null ? `${years} years old` : null, p.dateOfBirth ? `Born ${formatDate(p.dateOfBirth)}` : null].filter(Boolean).join(' · ')}</p>

      {tel && (
        <a class="btn primary call" href={`tel:${tel}`} style="margin-top:20px;background:var(--danger);border-color:var(--danger)">
          Call {p.contact.name ?? 'emergency contact'}
          {p.contact.relation ? ` (${p.contact.relation})` : ''}
        </a>
      )}

      <div class="card" style="margin-top:20px">
        <dl class="facts">
          <div class="fact"><dt>Blood type</dt><dd>{p.bloodType && p.bloodType !== 'unknown' ? p.bloodType : 'Not recorded'}</dd></div>
          <div class="fact"><dt>Organ donor</dt><dd>{p.organDonor === null ? 'Not recorded' : p.organDonor ? 'Yes' : 'No'}</dd></div>
        </dl>
      </div>

      <h2>Allergies</h2>
      <List items={p.allergies} empty="No allergies recorded" alert />
      <h2>Conditions</h2>
      <List items={p.conditions} empty="No conditions recorded" />
      <h2>Medications</h2>
      <List items={p.medications} empty="No medications recorded" />

      <footer>Provided by the patient for emergencies. Information may be incomplete; confirm when possible. Each view is recorded and the patient is notified.</footer>
    </Page>
  );
}
