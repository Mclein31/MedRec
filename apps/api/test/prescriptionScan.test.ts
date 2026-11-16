import { afterAll, describe, expect, it } from 'vitest';
import { askRemy, isMedicationDecisionQuestion, scanDocument } from '../src/lib/gemini';
import { JPEG, call, env, pool, setFetch, signUp } from './helpers';

afterAll(() => pool.end());

async function upload(token: string) {
  return call('POST', '/api/records/files', { token, body: JPEG, headers: { 'content-type': 'application/octet-stream' } });
}

describe('prescription scan extraction', () => {
  it('sends enriched medication schema and preserves structured fields without inventing missing values', async () => {
    const { token } = await signUp();
    const file = await upload(token);
    let sentBody: Record<string, any> = {};

    setFetch(async (_input, init) => {
      sentBody = JSON.parse(String(init?.body ?? '{}'));
      const draft = {
        title: 'Amoxicillin & Salbutamol Prescription',
        category: 'prescription',
        eventDate: '2026-11-16',
        provider: 'Dr. Reyes',
        facility: 'City Clinic',
        summary: 'Prescription for Amoxicillin 500 mg for 7 days and Salbutamol inhaler as needed.',
        findings: ['Finish full antibiotic course.'],
        medications: [
          {
            name: 'Amoxicillin',
            dosage: null,
            strength: '500 mg',
            dose: '1 capsule',
            frequency: '3 times daily',
            scheduleKind: 'daily_times',
            times: [],
            intervalHours: null,
            mealTiming: 'with_meal',
            durationDays: 7,
            endDate: '2026-11-22',
            instructions: 'Finish full course.',
            confidence: 'high',
          },
          {
            name: 'Azithromycin',
            dosage: '250 mg',
            strength: '250 mg',
            dose: null,
            frequency: null,
            scheduleKind: null,
            times: [],
            intervalHours: null,
            mealTiming: null,
            durationDays: null,
            endDate: null,
            instructions: null,
            confidence: 'high',
          },
          {
            name: 'Salbutamol',
            dosage: '100 mcg/puff, 2 puffs',
            strength: '100 mcg/puff',
            dose: '2 puffs',
            frequency: 'as needed for shortness of breath',
            scheduleKind: 'as_needed',
            times: [],
            intervalHours: null,
            mealTiming: 'anytime',
            durationDays: null,
            endDate: null,
            instructions: 'Use for wheezing.',
            confidence: 'high',
          },
        ],
        labValues: [],
        terms: [],
        legible: true,
      };
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] });
    });

    const res = await call('POST', '/api/records/scan', { token, json: { fileIds: [file.data.file.id] } });
    expect(res.status).toBe(200);

    const schemaMedProps = sentBody.generationConfig?.responseSchema?.properties?.medications?.items?.properties;
    expect(Object.keys(schemaMedProps)).toEqual(
      expect.arrayContaining([
        'name',
        'dosage',
        'strength',
        'dose',
        'frequency',
        'scheduleKind',
        'times',
        'intervalHours',
        'mealTiming',
        'durationDays',
        'endDate',
        'instructions',
        'confidence',
      ]),
    );
    const systemText = String(sentBody.systemInstruction?.parts?.[0]?.text ?? '');
    expect(systemText).toMatch(/never invent/i);
    expect(systemText).toMatch(/times/i);

    const meds = res.data.draft.medications;
    expect(meds).toHaveLength(3);
    expect(meds[0]).toEqual({
      name: 'Amoxicillin',
      dosage: '500 mg, 1 capsule',
      strength: '500 mg',
      dose: '1 capsule',
      frequency: '3 times daily',
      scheduleKind: 'daily_times',
      times: [],
      intervalHours: null,
      mealTiming: 'with_meal',
      durationDays: 7,
      endDate: '2026-11-22',
      instructions: 'Finish full course.',
      confidence: 'high',
    });
    // Missing dose/frequency/times/duration stay null / [] and are never invented.
    expect(meds[1]).toMatchObject({
      name: 'Azithromycin',
      dosage: '250 mg',
      strength: '250 mg',
      dose: null,
      frequency: null,
      scheduleKind: null,
      times: [],
      durationDays: null,
      endDate: null,
    });
    expect(meds[2]).toMatchObject({
      name: 'Salbutamol',
      scheduleKind: 'as_needed',
      times: [],
      mealTiming: 'anytime',
    });
  });

  it('sanitizes invalid times, impossible dates, out-of-range numbers, and invalid enums', async () => {
    const fetcher: typeof fetch = async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Rx Scan',
                    category: 'prescription',
                    eventDate: '2026-02-30',
                    provider: 'Dr. Cruz',
                    facility: null,
                    summary: 'Prescription details.',
                    findings: [],
                    medications: [
                      {
                        name: '  ',
                        dosage: null,
                        frequency: null,
                        times: ['08:00'],
                        confidence: 'high',
                      },
                      {
                        name: ' Cephalexin ',
                        dosage: '  ',
                        strength: ' 500 mg ',
                        dose: ' 1 capsule ',
                        frequency: ' every 8 hours ',
                        scheduleKind: 'interval_hours',
                        times: ['20:00', '25:00', '08:60', 'morning', '8am', '08:00', '08:00'],
                        intervalHours: 8,
                        mealTiming: 'after_meal',
                        durationDays: 7,
                        endDate: '2026-02-30',
                        instructions: '   ',
                        confidence: 'high',
                      },
                      {
                        name: 'Ibuprofen',
                        dosage: null,
                        strength: '400 mg',
                        dose: '1 tablet',
                        frequency: 'as needed',
                        scheduleKind: 'as_needed',
                        times: ['09:00'],
                        intervalHours: 6,
                        mealTiming: 'with_food_bad',
                        durationDays: 999,
                        endDate: '2026-13-01',
                        instructions: 'For pain',
                        confidence: 'certain',
                      },
                      {
                        name: 'Metformin',
                        dosage: null,
                        strength: '500 mg',
                        dose: '1 tablet',
                        frequency: 'daily',
                        scheduleKind: 'weekly',
                        times: ['07:30'],
                        intervalHours: 25,
                        durationDays: 0,
                        endDate: '2026-12-01',
                        confidence: 'high',
                      },
                    ],
                    labValues: [],
                    terms: [],
                    legible: true,
                  }),
                },
              ],
            },
          },
        ],
      });

    const result = await scanDocument(env, fetcher, [{ mimeType: 'image/jpeg', data: JPEG.buffer as ArrayBuffer }]);
    expect(result.eventDate).toBeNull();
    expect(result.medications).toHaveLength(3);

    expect(result.medications[0]).toEqual({
      name: 'Cephalexin',
      dosage: '500 mg, 1 capsule',
      strength: '500 mg',
      dose: '1 capsule',
      frequency: 'every 8 hours',
      scheduleKind: 'interval_hours',
      times: ['08:00', '20:00'],
      intervalHours: 8,
      mealTiming: 'after_meal',
      durationDays: 7,
      endDate: null,
      instructions: null,
      confidence: 'high',
    });

    expect(result.medications[1]).toMatchObject({
      name: 'Ibuprofen',
      scheduleKind: 'as_needed',
      times: [],
      intervalHours: null,
      mealTiming: null,
      durationDays: null,
      endDate: null,
      instructions: 'For pain',
      confidence: 'low',
    });

    expect(result.medications[2]).toMatchObject({
      name: 'Metformin',
      scheduleKind: null,
      times: ['07:30'],
      intervalHours: null,
      durationDays: null,
      endDate: '2026-12-01',
      confidence: 'high',
    });
  });

  it('forces low confidence on every medication when legible is false', async () => {
    const fetcher: typeof fetch = async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Blurry prescription',
                    category: 'prescription',
                    eventDate: '2026-11-10',
                    provider: null,
                    facility: null,
                    summary: 'Handwriting is blurry.',
                    findings: [],
                    medications: [
                      {
                        name: 'Losartan',
                        dosage: '50 mg',
                        strength: '50 mg',
                        dose: '1 tablet',
                        frequency: 'once daily',
                        scheduleKind: 'daily_times',
                        times: [],
                        confidence: 'high',
                      },
                    ],
                    labValues: [],
                    terms: [],
                    legible: false,
                  }),
                },
              ],
            },
          },
        ],
      });

    const result = await scanDocument(env, fetcher, [{ mimeType: 'image/jpeg', data: JPEG.buffer as ArrayBuffer }]);
    expect(result.legible).toBe(false);
    expect(result.medications[0]?.confidence).toBe('low');
  });
});

describe('AiSnapshot backwards compatibility on records', () => {
  it('saves and retrieves both legacy and enriched AiSnapshot payloads and rejects invalid fields', async () => {
    const { token } = await signUp();

    const legacyAi = {
      summary: 'Old prescription format.',
      findings: [],
      medications: [{ name: 'Metformin', dosage: '500 mg', frequency: 'twice daily' }],
      labValues: [],
      terms: [],
      model: 'gemini-3.1-flash-lite',
    };
    const legacyRes = await call('POST', '/api/records', {
      token,
      json: {
        title: 'Legacy Rx',
        category: 'prescription',
        eventDate: '2026-01-15',
        provider: 'Dr. Lim',
        facility: null,
        notes: null,
        ai: legacyAi,
      },
    });
    expect(legacyRes.status).toBe(201);
    const fetchedLegacy = await call('GET', `/api/records/${legacyRes.data.record.id}`, { token });
    expect(fetchedLegacy.status).toBe(200);
    expect(fetchedLegacy.data.record.ai.medications).toEqual([
      { name: 'Metformin', dosage: '500 mg', frequency: 'twice daily' },
    ]);

    // Enriched snapshot from scanDocument (matches add.tsx spreading draft minus top-level fields)
    const enrichedAi = {
      summary: 'Antibiotic prescription.',
      findings: ['Take until finished'],
      medications: [
        {
          name: 'Amoxicillin',
          dosage: '500 mg, 1 capsule',
          strength: '500 mg',
          dose: '1 capsule',
          frequency: '3 times daily',
          scheduleKind: 'daily_times',
          times: ['08:00', '14:00', '20:00'],
          intervalHours: null,
          mealTiming: 'with_meal',
          durationDays: 7,
          endDate: '2026-11-22',
          instructions: 'Finish full course',
          confidence: 'high',
        },
      ],
      labValues: [],
      terms: [],
      model: 'gemini-3.5-flash-lite',
    };
    const enrichedRes = await call('POST', '/api/records', {
      token,
      json: {
        title: 'Enriched Rx',
        category: 'prescription',
        eventDate: '2026-11-16',
        provider: 'Dr. Reyes',
        facility: 'Metro Clinic',
        notes: null,
        ai: enrichedAi,
      },
    });
    expect(enrichedRes.status).toBe(201);
    expect(enrichedRes.data.record.ai.medications[0]).toMatchObject({
      name: 'Amoxicillin',
      strength: '500 mg',
      dose: '1 capsule',
      scheduleKind: 'daily_times',
      times: ['08:00', '14:00', '20:00'],
      mealTiming: 'with_meal',
      durationDays: 7,
      endDate: '2026-11-22',
      confidence: 'high',
    });

    const badTime = await call('POST', '/api/records', {
      token,
      json: {
        title: 'Invalid time',
        category: 'prescription',
        eventDate: '2026-11-16',
        provider: null,
        facility: null,
        notes: null,
        ai: {
          ...enrichedAi,
          medications: [{ ...enrichedAi.medications[0], times: ['25:00'] }],
        },
      },
    });
    expect(badTime.status).toBe(422);

    const badEndDate = await call('POST', '/api/records', {
      token,
      json: {
        title: 'Invalid endDate',
        category: 'prescription',
        eventDate: '2026-11-16',
        provider: null,
        facility: null,
        notes: null,
        ai: {
          ...enrichedAi,
          medications: [{ ...enrichedAi.medications[0], endDate: '2026-02-30' }],
        },
      },
    });
    expect(badEndDate.status).toBe(422);
  });
});

describe('Remy refusal of missed-dose and medication-change questions', () => {
  it('instructs Remy to refuse missed-dose/change decisions and passes through advice with prescription facts', async () => {
    const { token } = await signUp();
    await call('POST', '/api/records', {
      token,
      json: {
        title: 'Amoxicillin Prescription',
        category: 'prescription',
        eventDate: '2026-11-16',
        provider: 'Dr. Reyes',
        facility: 'City Clinic',
        notes: null,
        ai: {
          summary: 'Amoxicillin 500 mg 1 capsule 3 times daily for 7 days.',
          findings: [],
          medications: [{ name: 'Amoxicillin', dosage: '500 mg, 1 capsule', frequency: '3 times daily' }],
          labValues: [],
          terms: [],
          model: 'test',
        },
      },
    });

    let sentBody: Record<string, any> = {};
    setFetch(async (_input, init) => {
      sentBody = JSON.parse(String(init?.body ?? '{}'));
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    kind: 'advice',
                    answer:
                      'I cannot advise on missed doses or whether to double up. Your Amoxicillin Prescription from Nov 16, 2026 lists Amoxicillin 500 mg, 1 capsule, 3 times daily. Please ask your prescribing doctor or pharmacist.',
                    recordIds: ['R1'],
                    followUps: ['What are the instructions on my Amoxicillin Prescription?'],
                  }),
                },
              ],
            },
          },
        ],
      });
    });

    const res = await call('POST', '/api/ai/ask', {
      token,
      json: { question: 'I missed my morning amoxicillin dose, should I double up tonight?' },
    });
    expect(res.status).toBe(200);
    const systemText = String(sentBody.systemInstruction?.parts?.[0]?.text ?? '');
    expect(systemText).toMatch(/missed doses/i);
    expect(systemText).toMatch(/doubling up/i);
    expect(systemText).toMatch(/drug interactions/i);
    expect(res.data.kind).toBe('advice');
    expect(res.data.answer).toContain('pharmacist');
    expect(res.data.records).toHaveLength(1);
  });

  it('enforces advice refusal server-side even if the model returns kind "answer" on medication decisions', async () => {
    const recklessModel: typeof fetch = async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    kind: 'answer',
                    answer: 'Sure, take two pills tonight to catch up.',
                    recordIds: ['R1'],
                    followUps: ['Should I take them with water?'],
                  }),
                },
              ],
            },
          },
        ],
      });

    const decisionQuestions = [
      'I missed my morning dose, what should I do?',
      'Can I double up on my pills tonight?',
      'I feel better, can I stop taking my antibiotic early?',
      'Can I change the time I take my metformin to bedtime?',
      'Can I take ibuprofen with my amoxicillin?',
    ];

    for (const q of decisionQuestions) {
      expect(isMedicationDecisionQuestion(q)).toBe(true);
      const reply = await askRemy(env, recklessModel, 'R1: Amoxicillin Prescription', [], q);
      expect(reply.kind).toBe('advice');
      expect(reply.answer).not.toContain('take two');
      expect(reply.answer).toContain('pharmacist');
      expect(reply.followUps).toEqual([]);
    }

    // Normal prescription lookups should NOT trigger the decision backstop, and urgent always wins.
    const lookupQuestion = 'What are the instructions on my Amoxicillin Prescription?';
    expect(isMedicationDecisionQuestion(lookupQuestion)).toBe(false);
    const okLookup = await askRemy(
      env,
      async () =>
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      kind: 'answer',
                      answer: 'Your Amoxicillin Prescription says 500 mg, 1 capsule, 3 times daily.',
                      recordIds: ['R1'],
                      followUps: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      'R1: Amoxicillin Prescription',
      [],
      lookupQuestion,
    );
    expect(okLookup.kind).toBe('answer');

    const urgentReply = await askRemy(
      env,
      async () =>
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      kind: 'urgent',
                      answer: 'Call your local emergency number now.',
                      recordIds: [],
                      followUps: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      'R1: Amoxicillin Prescription',
      [],
      'I took two doses by mistake and have trouble breathing.',
    );
    expect(urgentReply.kind).toBe('urgent');
  });
});
