import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';

const GREEN = '#4FA381';
const GREEN_DARK = '#285B4D';
const GREEN_MID = '#3F8E74';
const GREEN_LIGHT = '#A7DFCE';
const BG = '#F1F8F5';
const MUTED = '#64748B';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'people-outline',
  diagnosis: 'medkit-outline',
  lab: 'flask-outline',
  prescription: 'document-text-outline',
  medication: 'medical-outline',
  appointment: 'calendar-outline',
  other: 'ellipsis-horizontal-outline',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRecord(id)
      .then((data) => setRecord(data.record))
      .catch((err: any) => {
        Alert.alert('Error loading record', err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleExplain = async () => {
    if (!record) return;

    setExplaining(true);

    try {
      const data = await api.explain(
        `${record.title}: ${record.description || ''}`
      );

      setExplanation(data.explanation);
    } catch (err: any) {
      Alert.alert('Explain failed', err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete record?',
      'This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRecord(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Delete failed', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </>
    );
  }

  if (!record) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={GREEN_LIGHT}
          />

          <Text style={styles.notFound}>
            Record not found
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.notFoundBack}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={GREEN}
            />

            <Text style={styles.notFoundBackText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  const recordType =
    record.type.charAt(0).toUpperCase() +
    record.type.slice(1);

  return (
    <>
      {/* Remove Expo Router's default "(tabs)" header */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.root}>

        {/* ─────────────────────────────
            CUSTOM HEADER
        ───────────────────────────── */}

        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#1E1E1E"
            />

            <Text style={styles.backText}>
              Back
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Record Details
          </Text>

          <View style={styles.headerSpacer} />
        </View>


        {/* ─────────────────────────────
            CONTENT
        ───────────────────────────── */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: insets.bottom + 32,
            },
          ]}
        >

          {/* Record Card */}
          <View style={styles.recordCard}>

            {/* Record Icon */}
            <View style={styles.recordIconBox}>
              <Ionicons
                name={
                  TYPE_ICONS[record.type] ||
                  'document-outline'
                }
                size={30}
                color={GREEN}
              />
            </View>

            {/* Title */}
            <Text style={styles.recordTitle}>
              {record.title}
            </Text>

            {/* Metadata */}
            <View style={styles.metaRow}>

              <View style={styles.metaChip}>
                <Ionicons
                  name="pricetag-outline"
                  size={15}
                  color={GREEN_MID}
                />

                <Text style={styles.metaChipText}>
                  {recordType}
                </Text>
              </View>

              <View style={styles.metaChip}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={GREEN_MID}
                />

                <Text style={styles.metaChipText}>
                  {formatDate(record.date)}
                </Text>
              </View>

            </View>

            {/* Notes */}
            {record.description && (
              <>
                <View style={styles.divider} />

                <Text style={styles.descriptionLabel}>
                  NOTES
                </Text>

                <Text style={styles.description}>
                  {record.description}
                </Text>
              </>
            )}

          </View>


          {/* AI Explain Button */}
          <Pressable
            onPress={handleExplain}
            disabled={explaining}
            style={({ pressed }) => [
              styles.explainBtn,
              pressed && styles.pressed,
              explaining && styles.explainBtnDisabled,
            ]}
          >
            {explaining ? (
              <ActivityIndicator
                size="small"
                color="#fff"
              />
            ) : (
              <Ionicons
                name="sparkles-outline"
                size={24}
                color="#fff"
              />
            )}

            <Text style={styles.explainBtnText}>
              {explaining
                ? 'Explaining...'
                : 'Explain This Record'}
            </Text>
          </Pressable>


          {/* AI Explanation */}
          {explanation && (
            <View style={styles.explanationCard}>

              <View style={styles.explanationHeader}>
                <View style={styles.explanationIcon}>
                  <Ionicons
                    name="sparkles"
                    size={15}
                    color={GREEN}
                  />
                </View>

                <Text style={styles.explanationLabel}>
                  AI Explanation
                </Text>
              </View>

              <Text style={styles.explanationText}>
                {explanation}
              </Text>

            </View>
          )}


          {/* Delete */}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={21}
              color="#F04438"
            />

            <Text style={styles.deleteBtnText}>
              Delete Record
            </Text>
          </Pressable>

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({

  // ─────────────────────────────
  // ROOT
  // ─────────────────────────────

  root: {
    flex: 1,
    backgroundColor: BG,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    gap: 12,
  },

  notFound: {
    fontSize: 17,
    fontWeight: '700',
    color: GREEN_DARK,
  },

  notFoundBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
  },

  notFoundBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN,
  },


  // ─────────────────────────────
  // HEADER
  // ─────────────────────────────

  header: {
    minHeight: 96,
    paddingHorizontal: 24,
    paddingBottom: 12,

    backgroundColor: '#fff',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: '#E6EFEB',
  },

  backButton: {
    width: 86,
    height: 42,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,

    borderRadius: 22,

    backgroundColor: '#F7FAF9',
  },

  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
    marginLeft: -2,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',

    position: 'absolute',
    left: 0,
    right: 0,

    textAlign: 'center',

    pointerEvents: 'none',
  },

  headerSpacer: {
    width: 86,
    height: 42,
  },


  // ─────────────────────────────
  // SCROLL
  // ─────────────────────────────

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 14,
  },


  // ─────────────────────────────
  // RECORD CARD
  // ─────────────────────────────

  recordCard: {
    backgroundColor: '#fff',

    borderRadius: 20,

    borderWidth: 1.5,
    borderColor: GREEN_LIGHT,

    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,

    gap: 12,
  },

  recordIconBox: {
    width: 70,
    height: 70,

    borderRadius: 20,

    backgroundColor: '#F0F8F5',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 12,
  },

  recordTitle: {
    fontSize: 28,
    lineHeight: 34,

    fontWeight: '700',

    color: GREEN_DARK,

    letterSpacing: -0.6,
  },


  // ─────────────────────────────
  // META CHIPS
  // ─────────────────────────────

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,

    flexWrap: 'wrap',

    marginTop: 2,
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    minHeight: 40,

    paddingHorizontal: 14,

    borderRadius: 22,

    backgroundColor: '#F4FAF7',

    borderWidth: 1.5,
    borderColor: GREEN_LIGHT,
  },

  metaChipText: {
    fontSize: 15,

    color: GREEN_MID,

    fontWeight: '500',
  },


  // ─────────────────────────────
  // DIVIDER
  // ─────────────────────────────

  divider: {
    height: 1,

    backgroundColor: '#BFE5D8',

    marginTop: 12,
    marginBottom: 12,
  },


  // ─────────────────────────────
  // NOTES
  // ─────────────────────────────

  descriptionLabel: {
    fontSize: 13,

    fontWeight: '600',

    color: GREEN_DARK,

    letterSpacing: 1.1,
  },

  description: {
    fontSize: 18,

    color: '#3C3C3C',

    lineHeight: 27,

    marginTop: 4,
  },


  // ─────────────────────────────
  // EXPLAIN BUTTON
  // ─────────────────────────────

  explainBtn: {
    minHeight: 64,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 12,

    backgroundColor: '#4FA381',

    borderRadius: 18,

    paddingHorizontal: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  explainBtnDisabled: {
    opacity: 0.75,
  },

  explainBtnText: {
    fontSize: 18,

    fontWeight: '700',

    color: '#fff',
  },


  // ─────────────────────────────
  // AI EXPLANATION
  // ─────────────────────────────

  explanationCard: {
    backgroundColor: '#fff',

    borderRadius: 18,

    borderWidth: 1,
    borderColor: GREEN_LIGHT,

    padding: 18,

    gap: 12,
  },

  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 8,
  },

  explanationIcon: {
    width: 30,
    height: 30,

    borderRadius: 15,

    backgroundColor: '#EDF8F3',

    alignItems: 'center',
    justifyContent: 'center',
  },

  explanationLabel: {
    fontSize: 13,

    fontWeight: '700',

    color: GREEN,

    textTransform: 'uppercase',

    letterSpacing: 0.7,
  },

  explanationText: {
    fontSize: 15,

    color: '#333',

    lineHeight: 23,
  },


  // ─────────────────────────────
  // DELETE
  // ─────────────────────────────

  deleteBtn: {
    minHeight: 64,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 10,

    borderWidth: 1.5,
    borderColor: '#FFB5B0',

    backgroundColor: '#FFF7F6',

    borderRadius: 18,

    paddingHorizontal: 20,
  },

  deleteBtnText: {
    fontSize: 17,

    fontWeight: '600',

    color: '#F04438',
  },


  // ─────────────────────────────
  // PRESS
  // ─────────────────────────────

  pressed: {
    opacity: 0.82,
  },
});