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

  root: {
    flex: 1,
    backgroundColor: BG,
  },


  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    gap: 12,
  },


  notFound: {
    marginTop: 10,
    fontSize: 16,
    color: GREEN_DARK,
    fontWeight: '700',
  },


  notFoundBack: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },


  notFoundBackText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },


  /*
  ==========================
  HEADER
  ==========================
  */


  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 115,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 20,
    backgroundColor: BG,
    zIndex: 20,
  },


  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 11,

    borderRadius: 30,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },


  backText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '700',
  },


  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 25,
    textAlign: 'center',
    color: '#12343B',
    fontSize: 22,
    fontWeight: '800',
  },


  headerSpacer: {
    width: 80,
  },


  pressed: {
    opacity: 0.75,
  },


  /*
  ==========================
  SCROLL
  ==========================
  */


  scroll: {
    paddingHorizontal: 24,
    paddingTop: 135,
    paddingBottom: 40,
    gap: 18,
  },


  /*
  ==========================
  RECORD CARD
  ==========================
  */


  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 5,
  },


  recordIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },


  recordTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#12343B',
    marginBottom: 16,
  },


  /*
  ==========================
  META CHIPS
  ==========================
  */


  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },


  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F6FBF9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 30,
  },


  metaChipText: {
    color: GREEN_MID,
    fontSize: 13,
    fontWeight: '600',
  },


  /*
  ==========================
  NOTES
  ==========================
  */


  divider: {
    height: 1,
    backgroundColor: '#E6EFEB',
    marginVertical: 24,
  },


  descriptionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: GREEN_MID,
    marginBottom: 12,
  },


  description: {
    fontSize: 18,
    color: '#34464A',
    lineHeight: 26,
  },


  /*
  ==========================
  AI BUTTON
  ==========================
  */


  explainBtn: {
    height: 62,
    borderRadius: 20,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,


    shadowColor: GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },


  explainBtnDisabled: {
    opacity: 0.7,
  },


  explainBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },


  /*
  ==========================
  AI RESULT CARD
  ==========================
  */


  explanationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset:{
      width:0,
      height:6,
    },
    elevation:3,
  },


  explanationHeader: {
    flexDirection:'row',
    alignItems:'center',
    gap:8,
  },


  explanationIcon:{
    width:28,
    height:28,
    borderRadius:14,
    backgroundColor:'#EEF8F5',
    alignItems:'center',
    justifyContent:'center',
  },


  explanationLabel:{
    color:GREEN,
    fontSize:13,
    fontWeight:'800',
    letterSpacing:1,
  },


  explanationText:{
    color:'#34464A',
    fontSize:15,
    lineHeight:23,
  },


  /*
  ==========================
  DELETE
  ==========================
  */


  deleteBtn:{
    height:62,
    borderRadius:20,
    backgroundColor:'#FFF8F8',
    borderWidth:1.5,
    borderColor:'#FFB8B8',


    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:10,
  },


  deleteBtnText:{
    color:'#F04438',
    fontSize:17,
    fontWeight:'700',
  },

});