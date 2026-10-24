import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../src/auth';
import { isCivilDate, todayIso } from '../src/format';
import { api, type Profile } from '../src/lib/api';
import { fieldError, messageFor } from '../src/lib/errors';
import { radius, space, useColors } from '../src/theme';
import { Banner, Button, Icon, Tappable, Txt } from '../src/ui/core';
import { Chip, Field } from '../src/ui/form';
import { Screen, Section } from '../src/ui/layout';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const SEX = [['female', 'Female'], ['male', 'Male'], ['intersex', 'Intersex'], ['unspecified', 'Prefer not to say']] as const;

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const c = useColors();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setDraft('');
  };
  return (
    <View style={{ gap: space.sm }}>
      <Field label={label} value={draft} onChangeText={setDraft} placeholder={placeholder} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false} />
      {!!draft.trim() && (
        <Tappable onPress={add} accessibilityLabel={`Add ${draft}`} style={{ alignSelf: 'flex-start' }}>
          <Txt variant="label" color={c.accent}>Add “{draft.trim()}”</Txt>
        </Tappable>
      )}
      {items.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {items.map((i) => (
            <Tappable key={i} onPress={() => onChange(items.filter((x) => x !== i))} accessibilityLabel={`Remove ${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 8, minHeight: 34, borderRadius: radius.pill, backgroundColor: c.accentSoft }}>
              <Txt variant="label">{i}</Txt>
              <Icon name="close" size={14} />
            </Tappable>
          ))}
        </View>
      )}
    </View>
  );
}

type Draft = Omit<Profile, 'email' | 'avatarUrl' | 'emergency' | 'heightCm' | 'weightKg'> & { heightCm: string; weightKg: string };

export default function ProfileEdit() {
  const c = useColors();
  const { state, setUser } = useAuth();
  const [d, setD] = useState<Draft | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.profile().then(({ profile: p }) => {
      const { email: _e, avatarUrl: _a, emergency: _m, ...rest } = p;
      setD({ ...rest, heightCm: p.heightCm?.toString() ?? '', weightKg: p.weightKg?.toString() ?? '' });
    }, setError);
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => (prev ? { ...prev, [k]: v } : prev));
  const text = (k: keyof Draft) => (v: string) => set(k, v as never);

  const save = async () => {
    if (!d) return;
    if (d.dateOfBirth && (!isCivilDate(d.dateOfBirth) || d.dateOfBirth > todayIso())) return setError(new Error('Enter your date of birth as YYYY-MM-DD.'));
    const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);
    setBusy(true);
    setError(null);
    try {
      const { profile } = await api.updateProfile({
        ...d,
        dateOfBirth: d.dateOfBirth || null,
        heightCm: num(d.heightCm),
        weightKg: num(d.weightKg),
        phone: d.phone?.trim() || null,
        emergencyContactName: d.emergencyContactName?.trim() || null,
        emergencyContactPhone: d.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: d.emergencyContactRelation?.trim() || null,
      });
      if (state.status === 'signedIn') setUser({ ...state.user, name: profile.name });
      router.back();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const close = (
    <Tappable onPress={() => router.back()} accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" size={24} color={c.ink} />
    </Tappable>
  );

  return (
    <Screen title="Health details" subtitle="Shown on your Medical ID and to doctors you share with." right={close} tabBar={false}>
      {!!error && <Banner message={error instanceof Error && !('status' in error) ? error.message : messageFor(error)} />}
      {d && (
        <>
          <Section title="About you">
            <Field label="Full name" value={d.name} onChangeText={text('name')} autoComplete="name" error={fieldError(error, 'name')} />
            <Field label="Date of birth" value={d.dateOfBirth ?? ''} onChangeText={(v) => set('dateOfBirth', v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" error={fieldError(error, 'dateOfBirth')} />
            <Txt variant="label" color={c.ink2}>Sex</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {SEX.map(([k, l]) => <Chip key={k} label={l} selected={d.sex === k} onPress={() => set('sex', d.sex === k ? null : k)} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Height (cm)" value={d.heightCm} onChangeText={text('heightCm')} keyboardType="decimal-pad" error={fieldError(error, 'heightCm')} /></View>
              <View style={{ flex: 1 }}><Field label="Weight (kg)" value={d.weightKg} onChangeText={text('weightKg')} keyboardType="decimal-pad" error={fieldError(error, 'weightKg')} /></View>
            </View>
          </Section>

          <Section title="Medical facts">
            <Txt variant="label" color={c.ink2}>Blood type</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {BLOOD.map((b) => <Chip key={b} label={b === 'unknown' ? "Don't know" : b} selected={d.bloodType === b} onPress={() => set('bloodType', d.bloodType === b ? null : b)} />)}
            </View>
            <ListEditor label="Allergies" items={d.allergies} onChange={(v) => set('allergies', v)} placeholder="e.g. Penicillin" />
            <ListEditor label="Conditions" items={d.conditions} onChange={(v) => set('conditions', v)} placeholder="e.g. Asthma" />
            <ListEditor label="Current medications" items={d.medications} onChange={(v) => set('medications', v)} placeholder="e.g. Metformin 500 mg twice daily" />
            <Txt variant="label" color={c.ink2}>Organ donor</Txt>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Chip label="Yes" selected={d.organDonor === true} onPress={() => set('organDonor', d.organDonor === true ? null : true)} />
              <Chip label="No" selected={d.organDonor === false} onPress={() => set('organDonor', d.organDonor === false ? null : false)} />
            </View>
          </Section>

          <Section title="Emergency contact">
            <Field label="Name" value={d.emergencyContactName ?? ''} onChangeText={text('emergencyContactName')} autoCapitalize="words" />
            <Field label="Relationship" value={d.emergencyContactRelation ?? ''} onChangeText={text('emergencyContactRelation')} placeholder="e.g. Sister" />
            <Field label="Phone" value={d.emergencyContactPhone ?? ''} onChangeText={text('emergencyContactPhone')} keyboardType="phone-pad" autoComplete="tel" error={fieldError(error, 'emergencyContactPhone')} />
          </Section>
          <Button label="Save details" onPress={save} loading={busy} />
        </>
      )}
    </Screen>
  );
}
