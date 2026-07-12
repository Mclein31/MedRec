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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'people-outline',
  diagnosis: 'medkit-outline',
  lab: 'flask-outline',
  prescription: 'document-text-outline',
  medication: 'medical-outline',
  appointment: 'calendar-outline',
  other: 'ellipsis-horizontal-outline',
};

// Formats the raw date string from the backend (e.g. "2026-06-29T16:00:00.000Z"
// or plain "2026-06-29") into a readable "June 29, 2026" format.
// Using UTC methods avoids timezone-offset issues that cause the date to appear
// one day earlier in timezones behind UTC.
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
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    api.getRecord(id)
      .then((data) => setRecord(data.record))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExplain = async () => {
    if (!record) return;
    setExplaining(true);
    try {
      const data = await api.explain(`${record.title}: ${record.description || ''}`);
      setExplanation(data.explanation);
    } catch (err: any) {
      Alert.alert('Explain failed', err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
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
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={GREEN_LIGHT} />
        <Text style={styles.notFound}>Record not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Record card */}
        <View style={styles.recordCard}>
          <View style={styles.recordIconBox}>
            <Ionicons
              name={TYPE_ICONS[record.type] || 'document-outline'}
              size={28}
              color={GREEN}
            />
          </View>
          <Text style={styles.recordTitle}>{record.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="pricetag-outline" size={12} color={GREEN_MID} />
              <Text style={styles.metaChipText}>
                {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={12} color={GREEN_MID} />
              <Text style={styles.metaChipText}>{formatDate(record.date)}</Text>
            </View>
          </View>
          {record.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionLabel}>Notes</Text>
              <Text style={styles.description}>{record.description}</Text>
            </>
          )}
        </View>

        {/* AI explain */}
        <Pressable
          onPress={handleExplain}
          disabled={explaining}
          style={({ pressed }) => [styles.explainBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="sparkles-outline" size={18} color="#fff" />
          <Text style={styles.explainBtnText}>
            {explaining ? 'Explaining...' : 'Explain This Record'}
          </Text>
        </Pressable>

        {explanation && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <Ionicons name="sparkles" size={14} color={GREEN} />
              <Text style={styles.explanationLabel}>AI Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{explanation}</Text>
          </View>
        )}

        {/* Delete */}
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={styles.deleteBtnText}>Delete Record</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
    color: GREEN_MID,
  },
  scroll: {
    padding: 20,
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 20,
    gap: 10,
  },
  recordIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: GREEN_DARK,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
  },
  metaChipText: {
    fontSize: 12,
    color: GREEN_MID,
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    backgroundColor: GREEN_LIGHT,
    marginVertical: 4,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN_MID,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
  },
  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
  },
  explainBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 16,
    gap: 8,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  explanationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FF3B30',
  },
});
