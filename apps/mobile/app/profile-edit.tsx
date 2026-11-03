import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useAuth } from '../src/auth';
import { isCivilDate, todayIso } from '../src/format';
import { api, type Profile } from '../src/lib/api';
import { fieldError, messageFor } from '../src/lib/errors';
import { space, useColors } from '../src/theme';
import { Avatar } from '../src/ui/Avatar';
import { Banner, Button, Tappable, Txt } from '../src/ui/core';
import { Chip, Field } from '../src/ui/form';
import { Screen, Section } from '../src/ui/layout';
import { ListEditor, withDraft } from '../src/ui/ListEditor';
import { PhotoSheet } from '../src/ui/PhotoSheet';
import { Remy } from '../src/ui/Remy';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const SEX = [['female', 'Female'], ['male', 'Male'], ['intersex', 'Intersex'], ['unspecified', 'Prefer not to say']] as const;
const LISTS = ['allergies', 'conditions', 'medications'] as const;
type ListKey = (typeof LISTS)[number];

type Draft = Omit<Profile, 'email' | 'avatarUrl' | 'emergency' | 'heightCm' | 'weightKg'> & { heightCm: string; weightKg: string };
type Errors = Partial<Record<'name' | 'dateOfBirth' | 'heightCm' | 'weightKg' | 'phone' | 'emergencyContactPhone', string>>;

const toDraft = (p: Profile): Draft => {
  const { email: _e, avatarUrl: _a, emergency: _m, ...rest } = p;
  return { ...rest, heightCm: p.heightCm?.toString() ?? '', weightKg: p.weightKg?.toString() ?? '' };
};
const num = (v: string) => (v.trim() ? Number(v.trim().replace(',', '.')) : null);
const PHONE = /^[+\d\s()-]*$/;

function check(d: Draft): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = 'Enter your name.';
  if (d.dateOfBirth && (!isCivilDate(d.dateOfBirth) || d.dateOfBirth > todayIso())) e.dateOfBirth = 'Use YYYY-MM-DD with a real past date, like 1990-04-12.';
  const h = num(d.heightCm);
  if (h !== null && !(h >= 30 && h <= 272)) e.heightCm = 'Enter a height between 30 and 272 cm.';
  const w = num(d.weightKg);
  if (w !== null && !(w >= 1 && w <= 500)) e.weightKg = 'Enter a weight between 1 and 500 kg.';
  if (d.phone && !PHONE.test(d.phone)) e.phone = 'Use digits, spaces, +, ( ) or -.';
  if (d.emergencyContactPhone && !PHONE.test(d.emergencyContactPhone)) e.emergencyContactPhone = 'Use digits, spaces, +, ( ) or -.';
  return e;
}

export default function ProfileEdit() {
  const c = useColors();
  const { section } = useLocalSearchParams<{ section?: 'medical' }>();
  const { state, setUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [lists, setLists] = useState<Record<ListKey, string>>({ allergies: '', conditions: '', medications: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const original = useRef<string>('');

  const load = () => {
    setError(null);
    api.profile().then(({ profile: p }) => {
      setProfile(p);
      const draft = toDraft(p);
      original.current = JSON.stringify(draft);
      setD(draft);
    }, (err) => setError(messageFor(err)));
  };
  useEffect(load, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => (prev ? { ...prev, [k]: v } : prev));
  const text = (k: keyof Draft) => (v: string) => set(k, v as never);
  const dirty = !!d && (JSON.stringify(d) !== original.current || LISTS.some((k) => lists[k].trim()));

  const save = async () => {
    if (!d || busy) return;
    // Text typed into a list but not yet added is saved too.
    const merged: Draft = { ...d, allergies: withDraft(d.allergies, lists.allergies), conditions: withDraft(d.conditions, lists.conditions), medications: withDraft(d.medications, lists.medications) };
    const found = check(merged);
    setErrors(found);
    if (Object.keys(found).length) return setError('Check the highlighted fields.');
    setBusy(true);
    setError(null);
    try {
      const { profile: saved } = await api.updateProfile({
        ...merged,
        name: merged.name.trim(),
        dateOfBirth: merged.dateOfBirth || null,
        heightCm: num(merged.heightCm),
        weightKg: num(merged.weightKg),
        phone: merged.phone?.trim() || null,
        emergencyContactName: merged.emergencyContactName?.trim() || null,
        emergencyContactPhone: merged.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: merged.emergencyContactRelation?.trim() || null,
      });
      if (state.status === 'signedIn') setUser({ ...state.user, name: saved.name });
      original.current = JSON.stringify(toDraft(saved));
      router.back();
    } catch (err) {
      const field = (['name', 'dateOfBirth', 'heightCm', 'weightKg', 'phone', 'emergencyContactPhone'] as const).find((f) => fieldError(err, f));
      if (field) setErrors({ [field]: fieldError(err, field)! });
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));
    if (!dirty) return leave();
    if (Platform.OS === 'web') return globalThis.confirm?.('Discard your changes?') === false ? undefined : leave();
    Alert.alert('Discard your changes?', "What you've changed here won't be saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  const medical = section === 'medical';
  const chipRow = { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } as const;
  return (
    <Screen
      nav={{ title: medical ? 'Edit Medical ID' : 'Edit profile', back: 'close', onBack: close }}
      title={medical ? 'Health details' : 'Your profile'}
      subtitle={medical ? 'Shown on your Medical ID and to doctors you share with.' : 'Your name and health details appear on your Medical ID and on records you share.'}
      tabBar={false}
      footer={d ? <Button label={busy ? 'Saving…' : 'Save changes'} onPress={save} loading={busy} /> : undefined}
    >
      {!d && !error && <Remy pose="reading" motion="read" size={120} style={{ alignSelf: 'center' }} />}
      {!!error && <Banner message={error} action={!d ? { label: 'Retry', onPress: load } : undefined} />}
      {d && profile && (
        <>
          {!medical && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Tappable onPress={() => setPhoto(true)} accessibilityLabel={profile.avatarUrl ? 'Change profile photo' : 'Add a profile photo'}>
                <Avatar name={d.name || profile.name} url={profile.avatarUrl} size={64} badge busy={photoBusy} />
              </Tappable>
              <View style={{ flex: 1, gap: 2 }}>
                <Tappable onPress={() => setPhoto(true)} accessibilityLabel={profile.avatarUrl ? 'Change photo' : 'Add photo'} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                  <Txt variant="label" color={c.accent}>{profile.avatarUrl ? 'Change photo' : 'Add photo'}</Txt>
                </Tappable>
                <Txt variant="caption" color={c.ink3}>Only you see your photo.</Txt>
              </View>
            </View>
          )}

          <Section title="About you">
            <Field label="Full name" value={d.name} onChangeText={text('name')} autoComplete="name" textContentType="name" autoCapitalize="words" error={errors.name} />
            {!medical && <Field label="Mobile number" value={d.phone ?? ''} onChangeText={text('phone')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="Optional" error={errors.phone} />}
            {!medical && (
              <View style={{ gap: 2 }}>
                <Txt variant="label">Email</Txt>
                <Txt color={c.ink3}>{profile.email}</Txt>
                <Txt variant="caption" color={c.ink3}>Used to sign in and receive your codes.</Txt>
              </View>
            )}
            <Field label="Date of birth" value={d.dateOfBirth ?? ''} onChangeText={(v) => set('dateOfBirth', v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" error={errors.dateOfBirth} />
            <Txt variant="label">Sex</Txt>
            <View style={chipRow}>
              {SEX.map(([k, l]) => <Chip key={k} label={l} selected={d.sex === k} onPress={() => set('sex', d.sex === k ? null : k)} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><Field label="Height (cm)" value={d.heightCm} onChangeText={text('heightCm')} keyboardType="decimal-pad" placeholder="e.g. 170" error={errors.heightCm} /></View>
              <View style={{ flex: 1 }}><Field label="Weight (kg)" value={d.weightKg} onChangeText={text('weightKg')} keyboardType="decimal-pad" placeholder="e.g. 65" error={errors.weightKg} /></View>
            </View>
          </Section>

          <Section title="Medical facts">
            <Txt variant="label">Blood type</Txt>
            <View style={chipRow}>
              {BLOOD.map((b) => <Chip key={b} label={b === 'unknown' ? "Don't know" : b} selected={d.bloodType === b} onPress={() => set('bloodType', d.bloodType === b ? null : b)} />)}
            </View>
            <ListEditor label="Allergies" items={d.allergies} onChange={(v) => set('allergies', v)} draft={lists.allergies} onDraft={(v) => setLists((l) => ({ ...l, allergies: v }))} placeholder="e.g. Penicillin" />
            <ListEditor label="Conditions" items={d.conditions} onChange={(v) => set('conditions', v)} draft={lists.conditions} onDraft={(v) => setLists((l) => ({ ...l, conditions: v }))} placeholder="e.g. Asthma" />
            <ListEditor label="Current medications" items={d.medications} onChange={(v) => set('medications', v)} draft={lists.medications} onDraft={(v) => setLists((l) => ({ ...l, medications: v }))} placeholder="e.g. Metformin 500 mg twice daily" />
            <Txt variant="label">Organ donor</Txt>
            <View style={chipRow}>
              <Chip label="Yes" selected={d.organDonor === true} onPress={() => set('organDonor', d.organDonor === true ? null : true)} />
              <Chip label="No" selected={d.organDonor === false} onPress={() => set('organDonor', d.organDonor === false ? null : false)} />
            </View>
          </Section>

          <Section title="Emergency contact">
            <Field label="Name" value={d.emergencyContactName ?? ''} onChangeText={text('emergencyContactName')} autoCapitalize="words" />
            <Field label="Relationship" value={d.emergencyContactRelation ?? ''} onChangeText={text('emergencyContactRelation')} placeholder="e.g. Sister" />
            <Field label="Phone" value={d.emergencyContactPhone ?? ''} onChangeText={text('emergencyContactPhone')} keyboardType="phone-pad" autoComplete="tel" error={errors.emergencyContactPhone} hint="Responders can call this number from your Medical ID." />
          </Section>

          <PhotoSheet visible={photo} onClose={() => setPhoto(false)} hasPhoto={!!profile.avatarUrl} onBusy={setPhotoBusy} onChange={(p) => setProfile(p)} />
        </>
      )}
    </Screen>
  );
}
