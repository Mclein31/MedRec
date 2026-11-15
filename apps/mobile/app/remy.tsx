import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type HealthRecord } from '../src/lib/api';
import { answer, replyText, urgentReply, type Reply, type Search } from '../src/remy/answer';
import { Answer, Failed, Question, Thinking } from '../src/remy/Messages';
import { GUTTER, MAX_CONTENT_WIDTH, radius, space, type as t, useColors } from '../src/theme';
import { Button, Icon, Tappable, Txt } from '../src/ui/core';
import { useTopInset } from '../src/ui/layout';
import { Rise, Swap } from '../src/ui/motion';
import { Remy, Sparkles } from '../src/ui/Remy';

type Turn = { id: number; question: string; reply?: Reply; failed?: boolean };

const STARTERS = ['Summarize my latest lab results', 'Were any of my results flagged?', 'What medications are in my records?'];
const search: Search = async (params) => (await api.records(params)).records;

export default function AskRemy() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();
  const [context, setContext] = useState<HealthRecord | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (recordId) api.record(recordId).then((r) => setContext(r.record), () => setContext(null));
  }, [recordId]);

  const ask = async (question: string, id = ++seq.current) => {
    const q = question.trim();
    if (!q || pending) return;
    setPending(true);
    setTurns((prev) => [...prev.filter((x) => x.id !== id), { id, question: q }]);
    // Earlier turns go with the question so follow-ups like "and the one before?" make sense.
    const history = turns.filter((x) => x.reply && x.id !== id).slice(-3).flatMap((x) => [{ role: 'user' as const, text: x.question }, { role: 'remy' as const, text: replyText(x.reply!).slice(0, 1500) }]);
    try {
      const reply = urgentReply(q) ?? (await fromAi(q, history, context?.id)) ?? (await answer(q, search, context));
      setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, reply, failed: false } : x)));
    } catch {
      // The draft stays cleared but the question is kept so Retry can resend it.
      setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, failed: true } : x)));
    } finally {
      setPending(false);
    }
  };

  const send = () => {
    if (!draft.trim() || pending) return;
    const q = draft;
    setDraft('');
    void ask(q);
  };

  const starters = context ? ['What does this record say?', context.ai?.labValues.some((v) => v.flag === 'high' || v.flag === 'low') ? 'Which values were flagged?' : 'What should I ask my doctor about this?', ...(context.ai?.terms[0] ? [`What does ${context.ai.terms[0].term} mean?`] : ['How does sharing work?'])] : STARTERS;
  const column = { width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const, paddingHorizontal: GUTTER };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[column, { paddingTop: top + space.sm, flexDirection: 'row', alignItems: 'center', minHeight: 52 + top }]}>
        <Txt variant="title" accessibilityRole="header" style={{ flex: 1 }}>Ask Remy</Txt>
        <Tappable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} accessibilityLabel="Close Ask Remy" style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
          <Txt variant="label">Close</Txt>
        </Tappable>
      </View>

      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={() => turns.length && scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={[column, { gap: space.xl, paddingVertical: space.lg }]}>
        <Swap id={turns.length ? 'conversation' : 'intro'} style={{ gap: space.xl }}>
        {turns.length === 0 ? (
          <View style={{ gap: space.lg }}>
            <View style={{ alignSelf: 'center', width: 220, height: 150, alignItems: 'center' }}>
              <Sparkles width={220} height={150} />
              <Remy pose="greeting" size={150} motion="wave" ground />
            </View>
            <Rise delay={120}>
              <Txt variant="hero" style={{ fontSize: 30, lineHeight: 36 }}>{'A little help,\nright here.'}</Txt>
            </Rise>
            <Rise delay={200}>
              <Txt color={c.ink3}>
                {context ? `Ask me about “${context.title}”, compare it with your other records, or anything about MedRec.` : 'Ask me about your records: results, medicines, dates and doctors. I can explain terms and help you use MedRec.'}
              </Txt>
            </Rise>
            {starters.map((s, i) => (
              <Rise key={s} delay={260 + i * 70}>
                <Button kind="secondary" label={s} onPress={() => void ask(s)} />
              </Rise>
            ))}
            <Txt variant="caption" color={c.ink3}>Remy reads your saved records with Google Gemini to answer. General information, not medical advice. For urgent symptoms, seek medical care.</Txt>
          </View>
        ) : (
          turns.map((x) => (
            <View key={x.id} style={{ gap: space.lg }}>
              <Question text={x.question} />
              {x.reply ? <Answer reply={x.reply} onAsk={x.id === turns[turns.length - 1]?.id && !pending ? (q) => void ask(q) : undefined} /> : x.failed ? <Failed onRetry={() => void ask(x.question, x.id)} /> : <Thinking />}
            </View>
          ))
        )}
        </Swap>
      </ScrollView>

      <View style={[column, { paddingTop: space.sm, paddingBottom: insets.bottom + space.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingLeft: space.lg, minHeight: 56 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question…"
            placeholderTextColor={c.ink3}
            accessibilityLabel="Ask Remy a question"
            returnKeyType="send"
            onSubmitEditing={send}
            maxLength={300}
            style={[t.body, { flex: 1, color: c.ink, paddingVertical: 12, outlineWidth: 0 }]}
            maxFontSizeMultiplier={1.6}
          />
          <Tappable onPress={send} disabled={!draft.trim() || pending} accessibilityLabel={pending ? 'Remy is looking' : 'Send'} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-up" size={24} color={draft.trim() && !pending ? c.ink : c.ink3} />
          </Tappable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Asks the AI, grounded in the person's records. Returns null when the AI can't be reached
 * (not configured, overloaded, rate-limited, offline) so the record search can answer instead.
 */
async function fromAi(question: string, history: { role: 'user' | 'remy'; text: string }[], recordId?: string): Promise<Reply | null> {
  try {
    const r = await api.askRemy(question, history, recordId);
    if (r.kind === 'urgent') return { kind: 'urgent', text: r.answer };
    return { kind: 'ai', tone: r.kind, text: r.answer, records: r.records, followUps: r.followUps };
  } catch {
    return null;
  }
}
