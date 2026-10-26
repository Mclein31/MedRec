import { useState } from 'react';
import { View } from 'react-native';
import { Remy } from '../src/ui/Remy';
import { formatDate } from '../src/format';
import { api, type HistorySummary } from '../src/lib/api';
import { messageFor } from '../src/lib/errors';
import { space, useColors } from '../src/theme';
import { Banner, Button, Txt } from '../src/ui/core';
import { Screen, Section } from '../src/ui/layout';

export default function Summary() {
  const c = useColors();
  const [result, setResult] = useState<{ summary: HistorySummary; basedOn: number; limited: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.aiSummary());
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <Section title={title}>
        {items.map((i) => <Txt key={i} color={c.ink2}>• {i}</Txt>)}
      </Section>
    );

  return (
    <Screen
      nav={{ title: 'Health summary', back: 'close' }}
      title="Your health summary."
      subtitle="A plain-language overview written from your records and health details."
      tabBar={false}
    >
      {error && <Banner message={error} />}
      {!result ? (
        <View style={{ gap: space.md }}>
          <Txt color={c.ink2}>MedRec sends the text of your newest records — not the photos — to Google Gemini to write this. Nothing is saved until you share it.</Txt>
          {busy && <Remy pose="reading" motion="read" size={140} ground style={{ alignSelf: 'center' }} />}
          <Button kind="dark" label={busy ? 'Writing summary…' : 'Write my summary'} onPress={generate} loading={busy} />
        </View>
      ) : (
        <>
          {result.limited && <Banner tone="info" message={`Based on your ${result.basedOn} newest records. Older records aren't included.`} />}
          <Txt>{result.summary.overview}</Txt>
          {list('Conditions', result.summary.conditions)}
          {list('Medications', result.summary.medications)}
          {list('Allergies', result.summary.allergies)}
          {result.summary.recentEvents.length > 0 && (
            <Section title="Recent">
              {result.summary.recentEvents.map((e, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Txt variant="caption" color={c.ink3}>{formatDate(e.date)}</Txt>
                  <Txt color={c.ink2}>{e.text}</Txt>
                </View>
              ))}
            </Section>
          )}
          <Txt variant="caption" color={c.ink3}>Written by AI from what you uploaded. It can be incomplete or wrong and is not medical advice.</Txt>
          <Button kind="secondary" label="Write again" onPress={generate} loading={busy} />
        </>
      )}
    </Screen>
  );
}
