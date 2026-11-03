import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { HealthRecord, Profile, Share } from '../lib/api';
import { Answer, Question } from '../remy/Messages';
import { GLOSSARY } from '../remy/answer';
import { space, useColors } from '../theme';
import { Eyebrow, Icon, Txt } from '../ui/core';
import { SearchField, TextTabs } from '../ui/form';
import { Rule } from '../ui/layout';
import { MedicalIdCard } from '../ui/MedicalIdCard';
import { Rise } from '../ui/motion';
import { RecordRow } from '../ui/RecordRow';
import { Remy } from '../ui/Remy';
import { ShareReceipt } from '../ui/ShareCard';

export type Preview = 'welcome' | 'records' | 'understand' | 'share' | 'medical';

const noAction = () => {};
const base = { provider: null, facility: 'Sample clinic', notes: null, ai: null, fileCount: 1, createdAt: '2026-10-22T09:00:00Z', updatedAt: '2026-10-22T09:00:00Z' };
const RECORDS: HealthRecord[] = [
  { ...base, id: 'onboarding-lab', title: 'Complete blood count', category: 'lab', eventDate: '2026-10-22' },
  { ...base, id: 'onboarding-visit', title: 'Annual checkup', category: 'consultation', eventDate: '2026-10-18' },
];
const PROFILE: Profile = {
  name: 'Alex Morgan', email: '', dateOfBirth: '1995-05-14', sex: null, bloodType: 'O+', heightCm: null, weightKg: null,
  allergies: ['Penicillin'], conditions: [], medications: [], organDonor: false, phone: null,
  emergencyContactName: 'Jamie Morgan', emergencyContactPhone: null, emergencyContactRelation: 'Sibling', avatarUrl: null,
  emergency: { enabled: false, url: null },
};
const SHARE: Share = {
  id: 'onboarding-example', label: null, scope: 'records', scopeLabel: '2 selected records', categories: [], recordCount: 2,
  createdAt: '2026-10-22T09:00:00Z', expiresAt: '2026-10-22T09:15:00Z', revokedAt: null, firstViewAt: null, viewCount: 0,
  state: 'expired', url: null,
};

/** These are production components with fictional data. Preview children never navigate or receive focus. */
function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessible accessibilityLabel={label}>
      <View {...(Platform.OS === 'web' ? { inert: true } : {})} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>
    </View>
  );
}

function RecordsPreview({ welcome = false, active }: { welcome?: boolean; active: boolean }) {
  const c = useColors();
  return (
    <View style={{ padding: space.xl, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.line, boxShadow: '0 14px 32px rgba(48,34,56,0.08)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: welcome ? 2 : space.md }}>
        <Txt variant="title">Your records.</Txt>
        <Txt variant="micro" color={c.ink3}>EXAMPLE</Txt>
      </View>
      {!welcome && <SearchField value="" onChangeText={noAction} placeholder="Find a record" />}
      {!welcome && <TextTabs items={[{ key: 'all', label: 'All' }, { key: 'lab', label: 'Lab results' }, { key: 'prescription', label: 'Prescriptions' }]} active="all" onSelect={noAction} />}
      {(welcome ? RECORDS.slice(0, 1) : RECORDS).map((r, i) => (
        <Rise key={r.id} active={active} delay={160 + i * 90} from={14} duration={420}>
          {i > 0 && <Rule />}
          <RecordRow record={r} onPress={noAction} />
        </Rise>
      ))}
    </View>
  );
}

export function StepPreview({ kind, active }: { kind: Preview; active: boolean }) {
  const c = useColors();
  if (kind === 'welcome') {
    return (
      <View style={{ minHeight: 284, paddingTop: space.md }}>
        <View style={{ position: 'absolute', width: 184, height: 184, borderRadius: 92, backgroundColor: c.gold, bottom: 0, right: -8 }} />
        <Rise active={active} delay={100} from={24} duration={650} scale={0.96} style={{ marginRight: 8, transform: [{ rotate: '-3deg' }] }}>
          <Example label="Example of MedRec's records list with a complete blood count.">
            <RecordsPreview welcome active={active} />
          </Example>
        </Rise>
        <Rise active={active} delay={340} from={12} duration={520} style={{ position: 'absolute', left: 0, bottom: 22, maxWidth: '53%' }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="creation-outline" size={16} color={c.ink} />
              <Eyebrow>Meet Remy</Eyebrow>
            </View>
            <Txt variant="headline" style={{ fontSize: 18, lineHeight: 24 }}>A little help.{'\n'}A lot more clarity.</Txt>
          </View>
        </Rise>
        <View style={{ position: 'absolute', right: -4, bottom: 0 }}>
          {active && <Remy pose="greeting" size={144} motion="wave" delay={240} />}
        </View>
      </View>
    );
  }
  if (kind === 'records') {
    return (
      <View style={{ gap: space.lg }}>
        <Example label="Example records screen. Search by name or date, filter by type, and open a complete blood count or annual checkup.">
          <RecordsPreview active={active} />
        </Example>
      </View>
    );
  }
  if (kind === 'understand') {
    return (
      <View style={{ padding: space.xl, borderRadius: 24, backgroundColor: c.surfaceSunken, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Eyebrow>Ask Remy</Eyebrow><Txt variant="micro" color={c.ink3}>GENERAL EXAMPLE</Txt>
        </View>
        <Example label={`Example Ask Remy conversation. You ask: What is HbA1c? Remy: ${GLOSSARY.hba1c} General information, not about your results. Confirm medical decisions with your clinician.`}>
          <View style={{ gap: space.lg }}>
            <Rise active={active} delay={130} from={8} duration={380}><Question text="What is HbA1c?" /></Rise>
            <Rise active={active} delay={330} from={14} duration={480}>
              <Answer showCaution={false} reply={{ kind: 'term', term: 'HbA1c', text: GLOSSARY.hba1c!, source: null, general: true }} />
            </Rise>
          </View>
        </Example>
      </View>
    );
  }
  if (kind === 'share') {
    return (
      <View style={{ backgroundColor: c.surfaceSunken, borderRadius: 24, padding: space.lg, gap: space.md }}>
        <Example label="Example of the actual MedRec QR receipt. Two selected records, view only, for 15 minutes. This sample code does not open records.">
          <ShareReceipt share={SHARE} example compact />
        </Example>
      </View>
    );
  }
  return (
    <View style={{ gap: space.lg }}>
      <Example label="Example Medical ID for Alex Morgan. Blood type O positive, penicillin allergy, emergency contact Jamie Morgan. The public emergency page is off by default.">
        <View style={{ backgroundColor: c.surface, borderRadius: 24, padding: space.md, borderWidth: 1, borderColor: c.line, gap: space.lg }}>
          <View style={{ paddingHorizontal: space.sm, paddingTop: space.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="headline">Medical ID</Txt><Txt variant="micro" color={c.ink3}>SAMPLE PROFILE</Txt>
          </View>
          <MedicalIdCard p={PROFILE} />
          <View style={{ paddingHorizontal: space.sm, gap: space.sm, paddingBottom: space.sm }}>
            <Eyebrow>Allergies</Eyebrow><Txt variant="headline" color={c.danger}>Penicillin</Txt>
            <Rule />
            <Eyebrow>Emergency contact</Eyebrow><Txt variant="headline">Jamie Morgan · Sibling</Txt>
          </View>
        </View>
      </Example>
    </View>
  );
}
