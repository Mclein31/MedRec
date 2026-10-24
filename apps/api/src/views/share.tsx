import { Page } from './layout';

export interface SharedFile {
  id: string;
  contentType: string;
  url: string;
}

export interface SharedRecord {
  id: string;
  title: string;
  categoryName: string;
  eventDate: string | null;
  provider: string | null;
  facility: string | null;
  notes: string | null;
  ai: {
    summary?: string;
    labValues?: { name: string; value: string; unit: string | null; range: string | null; flag: string }[];
    medications?: { name: string; dosage: string | null; frequency: string | null }[];
  } | null;
  files: SharedFile[];
}

export interface SharePageProps {
  patient: {
    name: string;
    dateOfBirth: string | null;
    sex: string | null;
    bloodType: string | null;
    allergies: string[];
    conditions: string[];
    medications: string[];
  };
  scopeLabel: string;
  endsIn: string;
  records: SharedRecord[];
  nonce: string;
}

export function formatDate(iso: string | null) {
  if (!iso) return 'Undated';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function age(dob: string | null, now: Date) {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) years--;
  return years;
}

function Chips(props: { items: string[]; alert?: boolean; empty: string }) {
  if (!props.items.length) return <p class="muted small">{props.empty}</p>;
  return (
    <div class="chips">
      {props.items.map((i) => (
        <span class={props.alert ? 'chip alert' : 'chip'}>{i}</span>
      ))}
    </div>
  );
}

function Record({ r }: { r: SharedRecord }) {
  const labs = r.ai?.labValues ?? [];
  return (
    <article class="record">
      <h3>{r.title}</h3>
      <div class="meta">
        <span>{formatDate(r.eventDate)}</span>
        <span>{r.categoryName}</span>
        {r.provider && <span>{r.provider}</span>}
        {r.facility && <span>{r.facility}</span>}
      </div>
      {r.ai?.summary && <p class="summary">{r.ai.summary}</p>}
      {r.notes && <p class="summary"><strong>Patient notes:</strong> {r.notes}</p>}
      {labs.length > 0 && (
        <table>
          <thead><tr><th>Test</th><th>Result</th><th>Reference</th></tr></thead>
          <tbody>
            {labs.map((l) => (
              <tr>
                <td>{l.name}</td>
                <td class={`flag-${l.flag}`}>{l.value}{l.unit ? ` ${l.unit}` : ''}{l.flag === 'high' ? ' ↑' : l.flag === 'low' ? ' ↓' : ''}</td>
                <td>{l.range ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.files.length > 0 && (
        <div class="pages">
          {r.files.map((f, i) => (
            <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={`Open page ${i + 1} of ${r.title}`}>
              {f.contentType.startsWith('image/') ? <img src={f.url} alt={`Page ${i + 1}`} loading="lazy" /> : <span class="pdf">PDF · page {i + 1}</span>}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export function SharePage(p: SharePageProps & { now: Date }) {
  const years = age(p.patient.dateOfBirth, p.now);
  return (
    <Page title={`${p.patient.name} · Shared records`}>
      <div class="bar">
        <span class="brand">MedRec</span>
        <button id="print" class="btn noprint" type="button">Print</button>
      </div>
      <h1>{p.patient.name}</h1>
      <p class="muted">
        {[years !== null ? `${years} years` : null, p.patient.sex && p.patient.sex !== 'unspecified' ? p.patient.sex : null, p.patient.dateOfBirth ? `Born ${formatDate(p.patient.dateOfBirth)}` : null]
          .filter(Boolean)
          .join(' · ') || 'Patient-provided records'}
      </p>
      <p class="notice" style="margin-top:16px">
        Shared by the patient: {p.scopeLabel}. Access ends {p.endsIn}. These records were uploaded by the patient and have not been verified by MedRec.
      </p>

      <h2>Key facts</h2>
      <div class="card">
        <dl class="facts">
          <div class="fact"><dt>Blood type</dt><dd>{p.patient.bloodType && p.patient.bloodType !== 'unknown' ? p.patient.bloodType : 'Not recorded'}</dd></div>
          <div class="fact"><dt>Records shared</dt><dd>{p.records.length}</dd></div>
        </dl>
        <h3 style="margin-top:16px">Allergies</h3>
        <div style="margin-top:6px"><Chips items={p.patient.allergies} alert empty="No allergies recorded" /></div>
        <h3 style="margin-top:16px">Conditions</h3>
        <div style="margin-top:6px"><Chips items={p.patient.conditions} empty="No conditions recorded" /></div>
        <h3 style="margin-top:16px">Current medications</h3>
        <div style="margin-top:6px"><Chips items={p.patient.medications} empty="No medications recorded" /></div>
      </div>

      <h2>Records</h2>
      <div class="card">
        {p.records.length ? p.records.map((r) => <Record r={r} />) : <p class="muted">No records match what the patient chose to share.</p>}
      </div>
      <footer>Viewed through a temporary MedRec link. Do not forward it; the patient can turn it off at any time.</footer>
      <script nonce={p.nonce} dangerouslySetInnerHTML={{ __html: "document.getElementById('print').addEventListener('click',function(){window.print()})" }} />
    </Page>
  );
}
