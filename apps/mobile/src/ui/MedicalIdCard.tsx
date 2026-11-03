import { View } from 'react-native';
import { formatDate } from '../format';
import type { Profile } from '../lib/api';
import { radius, space, useColors } from '../theme';
import { Eyebrow, Txt } from './core';

/** The same identity card is used in Medical ID and the first-use tour. */
export function MedicalIdCard({ p }: { p: Profile }) {
  const c = useColors();
  const blood = p.bloodType && p.bloodType !== 'unknown' ? p.bloodType : '—';
  return (
    <View style={{ backgroundColor: c.panel, borderRadius: radius.lg, padding: space.xl, gap: space.lg }} accessible accessibilityLabel={`Medical ID for ${p.name}. Blood type ${blood === '—' ? 'not recorded' : blood}.`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.lg }}>
        <View style={{ flex: 1, gap: space.sm }}>
          <Eyebrow color={c.onPanel}>{`Medical ID  /  ${p.name}`}</Eyebrow>
          <Txt variant="display" color={c.onPanel}>{p.name}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xs, paddingTop: space.lg }}>
          <Eyebrow color={c.onPanel}>Blood type</Eyebrow>
          <Txt variant="display" color={c.onPanel}>{blood}</Txt>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)' }} />
      <Txt variant="caption" color={c.onPanel}>
        {p.dateOfBirth ? `Born ${formatDate(p.dateOfBirth, { year: true })}` : 'Add your date of birth in Edit Medical ID'}
        {p.organDonor ? ' · Organ donor' : ''}
      </Txt>
    </View>
  );
}
