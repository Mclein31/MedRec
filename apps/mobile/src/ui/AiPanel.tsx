import { View } from 'react-native';
import type { AiSnapshot } from '../lib/api';
import { radius, space, useColors } from '../theme';
import { Eyebrow, Icon, Txt } from './core';

export function AiPanel({ ai, title = 'What this document says', summary = true }: { ai: AiSnapshot; title?: string; summary?: boolean }) {
  const c = useColors();
  return (
    <View style={{ gap: space.lg }}>
      {summary && (
        <View style={{ gap: space.sm }}>
          <Eyebrow>AI reading</Eyebrow>
          <Txt variant="headline">{title}</Txt>
          <Txt color={c.ink2}>{ai.summary}</Txt>
          <Txt variant="caption" color={c.ink3}>
            Read by AI from your pages. It can misread handwriting or small print; your doctor's interpretation comes first.
          </Txt>
        </View>
      )}

      {ai.labValues.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Eyebrow>Results from the document</Eyebrow>
          <View style={{ borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
            {ai.labValues.map((l, i) => {
              const out = l.flag === 'high' || l.flag === 'low';
              return (
                <View
                  key={`${l.name}-${i}`}
                  accessibilityLabel={`${l.name}: ${l.value}${l.unit ? ' ' + l.unit : ''}${out ? `, ${l.flag}` : ''}${l.range ? `, reference ${l.range}` : ''}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, backgroundColor: c.surface }}
                >
                  <Txt variant="body" style={{ flex: 1 }} numberOfLines={2}>{l.name}</Txt>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="label" color={out ? c.danger : c.ink}>
                      {l.value}
                      {l.unit ? ` ${l.unit}` : ''}
                      {l.flag === 'high' ? ' ↑' : l.flag === 'low' ? ' ↓' : ''}
                    </Txt>
                    {l.range && <Txt variant="micro" color={c.ink3}>Ref. {l.range}</Txt>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {ai.medications.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Eyebrow>Medications mentioned</Eyebrow>
          {ai.medications.map((m, i) => (
            <View key={`${m.name}-${i}`} style={{ flexDirection: 'row', gap: space.sm }}>
              <Icon name="pill" size={16} color={c.ink3} />
              <Txt style={{ flex: 1 }}>
                {m.name}
                <Txt color={c.ink3}>{[m.dosage, m.frequency].filter(Boolean).map((x) => ` · ${x}`).join('')}</Txt>
              </Txt>
            </View>
          ))}
        </View>
      )}

      {ai.findings.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Eyebrow>Noted on the page</Eyebrow>
          {ai.findings.map((f, i) => (
            <Txt key={i} color={c.ink2}>• {f}</Txt>
          ))}
        </View>
      )}

      {ai.terms.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Eyebrow>Terms explained</Eyebrow>
          {ai.terms.map((t, i) => (
            <Txt key={`${t.term}-${i}`} color={c.ink2}>
              <Txt variant="label">{t.term}</Txt> — {t.meaning}
            </Txt>
          ))}
        </View>
      )}
    </View>
  );
}
