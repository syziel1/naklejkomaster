import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { UserCard, QRPayload } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { QrCode, Camera, X } from 'lucide-react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;

export default function TradeScreen() {
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { user, session } = useAuth();

  useEffect(() => {
    loadMyCards();
  }, [user]);

  const loadMyCards = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_cards')
        .select('*, cards(*)')
        .eq('owner_id', user.id)
        .order('acquired_at', { ascending: false });

      if (error) throw error;
      setMyCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async (card: UserCard) => {
    setProcessing(true);
    try {
      const apiUrl = `${supabaseUrl}/functions/v1/qr-create`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardInstanceId: card.id }),
      });

      const result = await response.json();

      if (response.ok) {
        setQrData(result.qrPayload);
        setSelectedCard(card);
      } else {
        Alert.alert('Błąd', result.error || 'Nie udało się wygenerować kodu QR');
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      Alert.alert('Błąd', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanQR = async (data: string) => {
    setShowScanner(false);
    setProcessing(true);

    try {
      const payload: QRPayload = JSON.parse(data);

      if (!selectedCard) {
        Alert.alert('Błąd', 'Wybierz swoją kartę do wymiany');
        setProcessing(false);
        return;
      }

      const apiUrl = `${supabaseUrl}/functions/v1/qr-accept`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId: payload.offerId,
          consumerCardInstanceId: selectedCard.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Sukces!', 'Wymiana zakończona pomyślnie!');
        setQrData(null);
        setSelectedCard(null);
        loadMyCards();
      } else {
        Alert.alert('Błąd', result.error || 'Nie udało się dokonać wymiany');
      }
    } catch (error: any) {
      console.error('Error accepting trade:', error);
      Alert.alert('Błąd', error.message || 'Nieprawidłowy kod QR');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do kamery, aby zeskanować kod QR');
        return;
      }
    }
    setShowScanner(true);
  };

  const rarityColors = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
  };

  const renderCard = ({ item }: { item: UserCard }) => {
    const card = item.cards;
    if (!card) return null;

    const isSelected = selectedCard?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.miniCard,
          { borderColor: rarityColors[card.rarity] },
          isSelected && styles.miniCardSelected,
        ]}
        onPress={() => setSelectedCard(item)}
      >
        <View style={[styles.miniCardImage, { backgroundColor: rarityColors[card.rarity] + '20' }]}>
          <Text style={[styles.miniCardInitials, { color: rarityColors[card.rarity] }]}>
            {card.name.substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.miniCardName} numberOfLines={1}>{card.name}</Text>
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
        <Text style={styles.title}>Wymiana Kart</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>1. Wybierz swoją kartę</Text>
        {myCards.length === 0 ? (
          <Text style={styles.emptyText}>Nie masz jeszcze żadnych kart</Text>
        ) : (
          <FlatList
            data={myCards}
            renderItem={renderCard}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsList}
          />
        )}

        {selectedCard && (
          <>
            <Text style={styles.sectionTitle}>2. Udostępnij kod QR lub zeskanuj</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.generateButton]}
                onPress={() => handleGenerateQR(selectedCard)}
                disabled={processing}
              >
                <QrCode size={24} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {qrData ? 'Odśwież QR' : 'Generuj QR'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.scanButton]}
                onPress={handleOpenScanner}
                disabled={processing}
              >
                <Camera size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Skanuj QR</Text>
              </TouchableOpacity>
            </View>

            {qrData && (
              <View style={styles.qrCard}>
                <Text style={styles.qrTitle}>Twój kod QR</Text>
                <View style={styles.qrPlaceholder}>
                  <QrCode size={120} color="#10b981" />
                  <Text style={styles.qrNote}>Pokaż ten kod drugiej osobie</Text>
                  <Text style={styles.qrExpiry}>Kod wygasa po 2 minutach</Text>
                </View>
                <Text style={styles.qrData} numberOfLines={3}>{qrData}</Text>
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Zeskanuj kod QR</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={({ data }) => {
              if (data && !processing) {
                handleScanQR(data);
              }
            }}
          />
        </View>
      </Modal>

      {processing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.overlayText}>Przetwarzanie...</Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  cardsList: {
    paddingBottom: 16,
    gap: 12,
  },
  miniCard: {
    width: 100,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
  },
  miniCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  miniCardImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniCardInitials: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  miniCardName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  generateButton: {
    backgroundColor: '#3b82f6',
  },
  scanButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qrCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  qrPlaceholder: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
  },
  qrExpiry: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
  },
  qrData: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#111827',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});
