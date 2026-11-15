import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth';
import { formatDate } from '../../src/format';
import { loadPeople, setActivePerson, useActivePerson } from '../../src/people';
import { space, useColors } from '../../src/theme';
import { Avatar } from '../../src/ui/Avatar';
import { Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Empty, Group, Screen } from '../../src/ui/layout';

/** Family members kept on this account (DD-55). */
export default function Family() {
  const c = useColors();
  const { state } = useAuth();
  const { people, personId } = useActivePerson();
  const userId = state.status === 'signedIn' ? state.user.id : null;
  useEffect(() => { if (userId) void loadPeople(userId); }, [userId]);

  return (
    <Screen
      tabBar={false}
      nav={{ title: 'Family members' }}
      title={'Caring for\nsomeone else?'}
      subtitle="Keep a child's or parent's records, Medical ID and doctor shares separate from yours, all in one account."
      footer={<Button label="Add a family member" icon="account-plus-outline" onPress={() => router.push('/family/new')} />}
    >
      {people.length === 0 ? (
        <Empty pose="curious" motion="peek" title="No family members yet" message="Add someone to start keeping their records. You can switch between people from Records, Medical ID and Share." align="start" />
      ) : (
        <Group bare>
          {people.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
              <Avatar name={p.name} url={null} size={44} />
              <Tappable onPress={() => router.push({ pathname: '/family/[id]', params: { id: p.id } })} accessibilityLabel={`Edit ${p.name}`} style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline">{p.name}</Txt>
                <Txt variant="caption" color={c.ink3}>
                  {[p.relation, p.dateOfBirth ? `Born ${formatDate(p.dateOfBirth, { year: true })}` : null, `${p.recordCount ?? 0} ${(p.recordCount ?? 0) === 1 ? 'record' : 'records'}`].filter(Boolean).join(' · ')}
                </Txt>
              </Tappable>
              {personId === p.id ? (
                <Txt variant="caption" color={c.ink2}>Viewing</Txt>
              ) : (
                <Tappable onPress={() => { void setActivePerson(p.id); router.dismissTo('/(tabs)'); }} accessibilityLabel={`View ${p.name}'s records`} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Txt variant="label">View</Txt>
                  <Icon name="arrow-right" size={18} color={c.ink} />
                </Tappable>
              )}
            </View>
          ))}
        </Group>
      )}
      <Txt variant="caption" color={c.ink3}>Only you can see family members you add. Removing someone deletes their records and share links.</Txt>
    </Screen>
  );
}
