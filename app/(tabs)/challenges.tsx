import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Challenge } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, CheckCircle, Clock } from 'lucide-react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (challengeId: string) => {
    if (!session?.access_token) {
      Alert.alert('Błąd', 'Brak aktywnej sesji. Zaloguj się ponownie.');
      return;
    }

    setClaiming(challengeId);
    try {
      const apiUrl = `${supabaseUrl}/functions/v1/mint`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId }),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse claim response:', parseError);
      }

      if (response.ok) {
        const rewardMessage = (() => {
          if (!result) return 'Nagroda została odebrana!';

          if (result.reward?.type === 'xp') {
            return `Zdobyto ${result.reward.amount} XP!`;
          }

          if (Array.isArray(result.cards) && result.cards.length > 0) {
            return 'Nowe karty zostały dodane do kolekcji!';
          }

          return result.message || 'Nagroda została odebrana!';
        })();

        Alert.alert('Sukces!', rewardMessage);
        loadChallenges();
      } else {
        const errorMessage = result?.error || 'Nie udało się odebrać nagrody';
        Alert.alert('Błąd', errorMessage);
      }
    } catch (error: any) {
      console.error('Error claiming challenge:', error);
      Alert.alert('Błąd', error?.message || 'Wystąpił błąd');
    } finally {
      setClaiming(null);
    }
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const isDaily = item.periodic === 'daily';

    return (
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <View style={styles.challengeIcon}>
            <Trophy size={24} color="#fbbf24" />
          </View>
          <View style={styles.challengeBadge}>
            <Clock size={12} color="#9ca3af" />
            <Text style={styles.challengeBadgeText}>
              {isDaily ? 'Dzienne' : 'Tygodniowe'}
            </Text>
          </View>
        </View>

        <Text style={styles.challengeTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.challengeDescription}>{item.description}</Text>
        )}

        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>Nagroda</Text>
          <Text style={styles.rewardValue}>
            {item.reward_type === 'pack' && `Paczka ${item.reward_value.toUpperCase()}`}
            {item.reward_type === 'card' && 'Specjalna karta'}
            {item.reward_type === 'xp' && `${item.reward_value} XP`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.claimButton,
            claiming === item.id && styles.claimButtonDisabled,
          ]}
          onPress={() => handleClaim(item.id)}
          disabled={claiming === item.id}
        >
          {claiming === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.claimButtonText}>Odbierz nagrodę</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wyzwania</Text>
      </View>

      {challenges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Brak dostępnych wyzwań</Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          renderItem={renderChallenge}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  challengeCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fef3c7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  challengeBadgeText: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '600',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  rewardCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  rewardLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  claimButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
