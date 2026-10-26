import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { api } from '../../src/lib/api';
import { space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { AiPanel } from '../../src/ui/AiPanel';
import { Banner, Button, Eyebrow, TextLink, Txt } from '../../src/ui/core';
import { Rule, Screen } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';
import { Remy } from '../../src/ui/Remy';

/** General questions only: they help a conversation with a clinician and never interpret the result. */
const QUESTIONS = ['What do these results mean for me?', 'How do they compare with my earlier results?', 'Is any follow-up needed?'];

export default function Explain() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, error, reload } = useLoad(() => api.record(id).then((x) => x.record), [id]);
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/record/[id]', params: { id } }));

  return (
    <Screen
      tabBar={false}
      tint={c.surfaceSunken}
      nav={{ title: 'Plain-language explanation', onBack: back }}
      eyebrow={<Eyebrow>AI explanation</Eyebrow>}
      title={'Understand\nthis record.'}
      footer={<Button kind="dark" label="Back to the record" onPress={back} />}
    >
      {error && <Banner message={error} action={{ label: 'Retry', onPress: reload }} />}
      {!r && !error && <Remy pose="reading" motion="read" size={120} style={{ alignSelf: 'center' }} />}
      {r && !r.ai && <Txt color={c.ink3}>No AI reading was saved with this record.</Txt>}
      {r?.ai && (
        <>
          <Rise>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Txt style={{ flex: 1 }}>{r.ai.summary}</Txt>
              <Remy pose="reading" size={56} motion="read" />
            </View>
          </Rise>
          <Rule />
          <AiPanel ai={r.ai} summary={false} />
          <Rule />
          <View style={{ gap: space.md }}>
            <Txt variant="headline" style={{ fontSize: 18 }} accessibilityRole="header">Take this to your doctor</Txt>
            {QUESTIONS.map((q, i) => (
              <Rise key={q} delay={120 + i * 80}>
                <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
                  <Txt variant="numeral" style={{ width: 46 }}>{String(i + 1).padStart(2, '0')}</Txt>
                  <Txt style={{ flex: 1, paddingTop: 4 }}>{q}</Txt>
                </View>
              </Rise>
            ))}
          </View>
          <Txt variant="caption" color={c.ink3}>AI can make mistakes. Check the original and ask your clinician about medical decisions.</Txt>
          {r.files[0] && <TextLink label="Open the original document" onPress={() => void Linking.openURL(r.files[0]!.url)} />}
        </>
      )}
    </Screen>
  );
}
