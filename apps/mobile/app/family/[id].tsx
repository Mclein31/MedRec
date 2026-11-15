import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { isCivilDate, todayIso } from '../../src/format';
import { api, type Person, type PersonInput } from '../../src/lib/api';
import { fieldError, messageFor } from '../../src/lib/errors';
import { NONE } from '../../src/listDraft';
import { dropPerson, setActivePerson, upsertPerson } from '../../src/people';
import { space, useColors } from '../../src/theme';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Chip, Field } from '../../src/ui/form';
import { Screen, Section } from '../../src/ui/layout';
import { ListEditor, withDraft } from '../../src/ui/ListEditor';
import { Remy } from '../../src/ui/Remy';

const RELATIONS = ['Child', 'Parent', 'Partner', 'Sibling', 'Grandparent', 'Other'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const SEX = [['female', 'Female'], ['male', 'Male'], ['intersex', 'Intersex'], ['unspecified', 'Prefer not to say']] as const;
const LISTS = ['allergies', 'conditions', 'medications'] as const;
type ListKey = (typeof LISTS)[number];
type Draft = Required<Omit<PersonInput, 'organDonor'>> & { organDonor: boolean | null };
type Errors = Partial<Record<'name' | 'dateOfBirth' | 'emergencyContactPhone', string>>;

const EMPTY: Draft = {
  name: '', relation: null, dateOfBirth: null, sex: null, bloodType: null, allergies: [], conditions: [], medications: [],
  organDonor: null, emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null,
};
const toDraft = (p: Person): Draft => ({
  name: p.name, relation: p.relation, dateOfBirth: p.dateOfBirth, sex: p.sex, bloodType: p.bloodType, allergies: p.allergies,
  conditions: p.conditions, medications: p.medications, organDonor: p.organDonor, emergencyContactName: p.emergencyContactName,
  emergencyContactPhone: p.emergencyContactPhone, emergencyContactRelation: p.emergencyContactRelation,
});
const PHONE = /^[+\d\s()-]*$/;

function check(d: Draft): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = 'Enter their name.';
  if (d.dateOfBirth && (!isCivilDate(d.dateOfBirth) || d.dateOfBirth > todayIso())) e.dateOfBirth = 'Use YYYY-MM-DD with a real past date, like 2018-04-12.';
  if (d.emergencyContactPhone && !PHONE.test(d.emergencyContactPhone)) e.emergencyContactPhone = 'Use digits, spaces, +, ( ) or -.';
  return e;
}

/** Add (`id` = "new") or edit a family member (DD-55). */
export default function FamilyMember() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const [d, setD] = useState<Draft | null>(isNew ? EMPTY : null);
  const [lists, setLists] = useState<Record<ListKey, string>>({ allergies: '', conditions: '', medications: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const original = useRef(JSON.stringify(EMPTY));

  const load = () => {
    if (isNew) return;
    setError(null);
    api.person(id).then(({ person }) => {
      const draft = toDraft(person);
      original.current = JSON.stringify(draft);
      setD(draft);
    }, (err) => setError(messageFor(err)));
  };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => (prev ? { ...prev, [k]: v } : prev));
  const text = (k: keyof Draft) => (v: string) => set(k, v as never);
  const dirty = !!d && (JSON.stringify(d) !== original.current || LISTS.some((k) => lists[k].trim()));
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/family'));

  const save = async () => {
    if (!d || busy) return;
    const merged: Draft = { ...d, allergies: withDraft(d.allergies, lists.allergies, NONE.allergies), conditions: withDraft(d.conditions, lists.conditions, NONE.conditions), medications: withDraft(d.medications, lists.medications, NONE.medications) };
    const found = check(merged);
    setErrors(found);
    if (Object.keys(found).length) return setError('Check the highlighted fields.');
    setBusy(true);
    setError(null);
    const input: Draft = {
      ...merged,
      name: merged.name.trim(),
      dateOfBirth: merged.dateOfBirth || null,
      emergencyContactName: merged.emergencyContactName?.trim() || null,
      emergencyContactPhone: merged.emergencyContactPhone?.trim() || null,
      emergencyContactRelation: merged.emergencyContactRelation?.trim() || null,
    };
    try {
      const { person } = isNew ? await api.addPerson(input) : await api.updatePerson(id, input);
      upsertPerson(person);
      original.current = JSON.stringify(toDraft(person));
      // A new family member is who you're here to work on: switch to them straight away.
      if (isNew) await setActivePerson(person.id);
      leave();
    } catch (err) {
      const field = (['name', 'dateOfBirth', 'emergencyContactPhone'] as const).find((f) => fieldError(err, f));
      if (field) setErrors({ [field]: fieldError(err, field)! });
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!dirty) return leave();
    if (Platform.OS === 'web') return globalThis.confirm?.('Discard your changes?') === false ? undefined : leave();
    Alert.alert('Discard your changes?', "What you've changed here won't be saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  const remove = () => {
    if (!d) return;
    const go = async () => {
      try {
        await api.removePerson(id);
        dropPerson(id);
        leave();
      } catch (err) {
        setError(messageFor(err));
      }
    };
    if (Platform.OS === 'web') return globalThis.confirm?.(`Remove ${d.name} and all of their records?`) ? void go() : undefined;
    Alert.alert(`Remove ${d.name}?`, 'Their records, pages, share links and Medical ID will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const first = d?.name.trim().split(/\s+/)[0] || 'them';
  const chipRow = { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } as const;
  return (
    <Screen
      nav={{ title: isNew ? 'Add family member' : 'Family member', back: 'close', onBack: close }}
      title={isNew ? 'Who are you caring for?' : d?.name || 'Family member'}
      subtitle={isNew ? 'Keep their records, Medical ID and doctor shares separate from yours.' : 'Shown on their Medical ID and to doctors you share their records with.'}
      tabBar={false}
      footer={d ? <Button label={busy ? 'Saving…' : isNew ? 'Add family member' : 'Save changes'} onPress={save} loading={busy} /> : undefined}
    >
      {!d && !error && <Remy pose="reading" motion="read" size={120} style={{ alignSelf: 'center' }} />}
      {!!error && <Banner message={error} action={!d ? { label: 'Retry', onPress: load } : undefined} />}
      {d && (
        <>
          <Section title="About them">
            <Field label="Name" value={d.name} onChangeText={text('name')} autoCapitalize="words" autoComplete="off" placeholder="e.g. Mia Santos" error={errors.name} />
            <Txt variant="label">Relationship to you</Txt>
            <View style={chipRow}>
              {RELATIONS.map((r) => <Chip key={r} label={r} selected={d.relation === r} onPress={() => set('relation', d.relation === r ? null : r)} />)}
            </View>
            <Field label="Date of birth" value={d.dateOfBirth ?? ''} onChangeText={(v) => set('dateOfBirth', v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" error={errors.dateOfBirth} />
            <Txt variant="label">Sex</Txt>
            <View style={chipRow}>
              {SEX.map(([k, l]) => <Chip key={k} label={l} selected={d.sex === k} onPress={() => set('sex', d.sex === k ? null : k)} />)}
            </View>
          </Section>

          <Section title="Medical facts">
            <Txt variant="label">Blood type</Txt>
            <View style={chipRow}>
              {BLOOD.map((b) => <Chip key={b} label={b === 'unknown' ? "Don't know" : b} selected={d.bloodType === b} onPress={() => set('bloodType', d.bloodType === b ? null : b)} />)}
            </View>
            <ListEditor label="Allergies" items={d.allergies} onChange={(v) => set('allergies', v)} draft={lists.allergies} onDraft={(v) => setLists((l) => ({ ...l, allergies: v }))} placeholder="e.g. Peanuts" none={NONE.allergies} />
            <ListEditor label="Conditions" items={d.conditions} onChange={(v) => set('conditions', v)} draft={lists.conditions} onDraft={(v) => setLists((l) => ({ ...l, conditions: v }))} placeholder="e.g. Asthma" none={NONE.conditions} />
            <ListEditor label="Current medications" items={d.medications} onChange={(v) => set('medications', v)} draft={lists.medications} onDraft={(v) => setLists((l) => ({ ...l, medications: v }))} placeholder="e.g. Salbutamol inhaler as needed" none={NONE.medications} />
          </Section>

          <Section title="Emergency contact">
            <Field label="Contact name" value={d.emergencyContactName ?? ''} onChangeText={text('emergencyContactName')} autoCapitalize="words" placeholder="Often you" />
            <Field label="Relationship" value={d.emergencyContactRelation ?? ''} onChangeText={text('emergencyContactRelation')} placeholder="e.g. Mother" />
            <Field label="Phone" value={d.emergencyContactPhone ?? ''} onChangeText={text('emergencyContactPhone')} keyboardType="phone-pad" autoComplete="tel" error={errors.emergencyContactPhone} hint={`Responders can call this number from ${first}'s Medical ID.`} />
          </Section>

          {!isNew && (
            <Tappable onPress={remove} accessibilityLabel={`Remove ${d.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, alignSelf: 'flex-start' }}>
              <Icon name="account-remove-outline" size={20} color={c.danger} />
              <Txt variant="label" color={c.danger}>Remove {first} and their records</Txt>
            </Tappable>
          )}
        </>
      )}
    </Screen>
  );
}
