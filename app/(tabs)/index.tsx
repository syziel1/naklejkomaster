import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { userExtended, profile, signOut, loading } = useAuth();
  const router = useRouter();

  const levelProgress = profile ? ((profile.xp % 100) / 100) * 100 : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Witaj!</Text>
      </View>
    );
  }

  const greeting = userExtended?.handle ? `Witaj, ${userExtended.handle}!` : 'Witaj!';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>Gotowy na przygodę?</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Wyloguj</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View>
            <Text style={styles.profileLabel}>Poziom</Text>
            <Text style={styles.profileValue}>{profile?.level || 1}</Text>
          </View>
          <View>
            <Text style={styles.profileLabel}>XP</Text>
            <Text style={styles.profileValue}>{profile?.xp || 0}</Text>
          </View>
          <View>
            <Text style={styles.profileLabel}>Seria</Text>
            <Text style={styles.profileValue}>{profile?.streak || 0}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {profile?.xp || 0} / {((Math.floor((profile?.xp || 0) / 100) + 1) * 100)} XP do poziomu {(profile?.level || 1) + 1}
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/cards')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' }]}>
            <Album size={24} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Moje Karty</Text>
          <Text style={styles.actionSubtitle}>Zobacz kolekcję</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/challenges')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
            <Target size={24} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Wyzwania</Text>
          <Text style={styles.actionSubtitle}>Zdobądź nagrody</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/trade')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
            <Shuffle size={24} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Wymiana</Text>
          <Text style={styles.actionSubtitle}>Handluj kartami</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/game/runner')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Gamepad size={24} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Mini Gra</Text>
          <Text style={styles.actionSubtitle}>Runner</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.newsCard}>
        <View style={styles.newsHeader}>
          <Sparkles size={20} color="#fbbf24" />
          <Text style={styles.newsTitle}>Naklejkomaster MVP</Text>
        </View>
        <Text style={styles.newsText}>
          Zbieraj karty, wymieniaj się z innymi graczami przez QR kod i ukończ wszystkie wyzwania!
        </Text>
      </View>
    </ScrollView>
  );
}

function Album({ size, color }: { size: number; color: string }) {
  return <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 4 }} />;
}

function Target({ size, color }: { size: number; color: string }) {
  return <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size }} />;
}

function Shuffle({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.8, height: 3, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: size * 0.8, height: 3, backgroundColor: color, transform: [{ rotate: '-45deg' }], marginTop: -3 }} />
    </View>
  );
}

function Gamepad({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.5, backgroundColor: color, borderRadius: size * 0.15 }} />
      <View style={{ width: size * 0.3, height: size * 0.3, backgroundColor: color, borderRadius: size * 0.15, position: 'absolute', top: -size * 0.05 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  profileLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  newsCard: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  newsText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
});
