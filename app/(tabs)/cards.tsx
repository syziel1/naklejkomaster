import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { UserCard, CardRarity } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function CardsScreen() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CardRarity | 'all'>('all');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadCards();
  }, [user]);

  const loadCards = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_cards')
        .select('*, cards(*)')
        .eq('owner_id', user.id)
        .order('acquired_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card => {
    if (filter === 'all') return true;
    return card.cards?.rarity === filter;
  });

  const rarityColors = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
  };

  const renderCard = ({ item }: { item: UserCard }) => {
    const card = item.cards;
    if (!card) return null;

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: rarityColors[card.rarity] }]}
        onPress={() => router.push(`/card-details?id=${item.id}`)}
      >
        {card.image_url ? (
          <Image source={{ uri: card.image_url }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: rarityColors[card.rarity] + '20' }]}>
            <Text style={[styles.cardImageText, { color: rarityColors[card.rarity] }]}>
              {card.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
          <Text style={[styles.cardRarity, { color: rarityColors[card.rarity] }]}>
            {card.rarity.toUpperCase()}
          </Text>
          <View style={styles.cardStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>HP</Text>
              <Text style={styles.statValue}>{card.hp}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>EN</Text>
              <Text style={styles.statValue}>{card.energy}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>LVL</Text>
              <Text style={styles.statValue}>{item.level}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.title}>Moje Karty</Text>
        <Text style={styles.count}>{filteredCards.length} kart</Text>
      </View>

      <View style={styles.filters}>
        {['all', 'common', 'rare', 'epic'].map((rarity) => (
          <TouchableOpacity
            key={rarity}
            style={[
              styles.filterButton,
              filter === rarity && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(rarity as CardRarity | 'all')}
          >
            <Text
              style={[
                styles.filterText,
                filter === rarity && styles.filterTextActive,
              ]}
            >
              {rarity === 'all' ? 'Wszystkie' : rarity.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Brak kart w tej kategorii</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  count: {
    fontSize: 14,
    color: '#9ca3af',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
  },
  cardImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardRarity: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#9ca3af',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
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
