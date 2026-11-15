import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../auth';
import { setActivePerson, useActivePerson } from '../people';
import { radius, space, useColors } from '../theme';
import { Avatar } from './Avatar';
import { Icon, Tappable, Txt } from './core';
import { Sheet } from './Sheet';

/**
 * "Viewing: Mia ▾". Switches whose records, Medical ID, shares and Remy answers the app shows (DD-55).
 * Hidden until the account has at least one family member; Profile → Family members adds the first.
 */
export function PersonSwitcher() {
  const c = useColors();
  const { state } = useAuth();
  const { person, people } = useActivePerson();
  const [open, setOpen] = useState(false);
  if (!people.length) return null;
  const me = state.status === 'signedIn' ? state.user.name : 'You';
  const pick = (id: string | null) => { setOpen(false); void setActivePerson(id); };
  const goTo = (to: '/family' | '/family/new') => { setOpen(false); router.push(to); };

  return (
    <>
      <Tappable
        onPress={() => setOpen(true)}
        haptic
        accessibilityLabel={`Viewing ${person ? person.name : 'your own records'}. Switch person`}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, paddingLeft: 4, paddingRight: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: person ? c.accent : c.line, backgroundColor: c.surface }}
      >
        <Avatar name={person ? person.name : me} url={null} size={30} />
        <Txt variant="label">{person ? person.name : 'You'}</Txt>
        <Icon name="chevron-down" size={18} color={c.ink2} />
      </Tappable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Whose records?" message="Records, Medical ID, sharing and Ask Remy follow the person you choose.">
        <View style={{ gap: 2 }} accessibilityRole="radiogroup">
          <Row name={me} detail="You" selected={!person} onPress={() => pick(null)} />
          {people.map((p) => (
            <Row key={p.id} name={p.name} detail={[p.relation, p.recordCount !== undefined ? `${p.recordCount} ${p.recordCount === 1 ? 'record' : 'records'}` : null].filter(Boolean).join(' · ')} selected={person?.id === p.id} onPress={() => pick(p.id)} />
          ))}
          <Tappable onPress={() => goTo('/family/new')} accessibilityLabel="Add a family member" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ink3, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={20} color={c.ink} />
            </View>
            <Txt variant="headline">Add a family member</Txt>
          </Tappable>
          <Tappable onPress={() => goTo('/family')} accessibilityLabel="Manage family members" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Txt variant="label" color={c.ink2}>Manage family members</Txt>
          </Tappable>
        </View>
      </Sheet>
    </>
  );
}

function Row({ name, detail, selected, onPress }: { name: string; detail: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Tappable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${name}${detail ? `, ${detail}` : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
      <Avatar name={name} url={null} size={40} />
      <View style={{ flex: 1 }}>
        <Txt variant="headline">{name}</Txt>
        {!!detail && <Txt variant="caption" color={c.ink3}>{detail}</Txt>}
      </View>
      {selected && <Icon name="check" size={22} color={c.ink} />}
    </Tappable>
  );
}
