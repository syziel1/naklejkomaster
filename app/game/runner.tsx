import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 40;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 50;
const GRAVITY = 0.8;
const JUMP_STRENGTH = -15;

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;

interface Obstacle {
  x: number;
  y: number;
  passed: boolean;
}

export default function RunnerGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [playerY, setPlayerY] = useState(SCREEN_HEIGHT / 2);
  const [playerVelocity, setPlayerVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seedRef = useRef<string>('');
  const signatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = setInterval(() => {
        updateGame();
      }, 1000 / 60);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      };
    }
  }, [gameStarted, gameOver, playerY, playerVelocity, obstacles]);

  const updateGame = () => {
    setPlayerVelocity(prev => prev + GRAVITY);
    setPlayerY(prev => {
      const newY = prev + playerVelocity;
      if (newY > SCREEN_HEIGHT - 100 - PLAYER_SIZE) {
        return SCREEN_HEIGHT - 100 - PLAYER_SIZE;
      }
      if (newY < 0) {
        return 0;
      }
      return newY;
    });

    setObstacles(prev => {
      const updated = prev.map(obs => ({
        ...obs,
        x: obs.x - 5,
      })).filter(obs => obs.x > -OBSTACLE_WIDTH);

      const playerLeft = 50;
      const playerRight = 50 + PLAYER_SIZE;
      const playerTop = playerY;
      const playerBottom = playerY + PLAYER_SIZE;

      for (const obs of updated) {
        const obsLeft = obs.x;
        const obsRight = obs.x + OBSTACLE_WIDTH;
        const obsTop = obs.y;
        const obsBottom = obs.y + OBSTACLE_HEIGHT;

        if (
          playerRight > obsLeft &&
          playerLeft < obsRight &&
          playerBottom > obsTop &&
          playerTop < obsBottom
        ) {
          endGame();
          return prev;
        }

        if (!obs.passed && obs.x + OBSTACLE_WIDTH < playerLeft) {
          obs.passed = true;
          setScore(s => s + 10);
        }
      }

      if (updated.length === 0 || updated[updated.length - 1].x < SCREEN_WIDTH - 200) {
        const gap = 150;
        const maxY = SCREEN_HEIGHT - 100 - OBSTACLE_HEIGHT - gap;
        const randomY = Math.random() * maxY;

        updated.push({
          x: SCREEN_WIDTH,
          y: randomY,
          passed: false,
        });

        updated.push({
          x: SCREEN_WIDTH,
          y: randomY + OBSTACLE_HEIGHT + gap,
          passed: false,
        });
      }

      return updated;
    });
  };

  const fetchGameToken = async (): Promise<{ seed: string; signature: string }> => {
    if (!session?.access_token) {
      throw new Error('Brak aktywnej sesji użytkownika');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/game-start`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ game: 'runner' }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Nie udało się pobrać tokenu gry');
    }

    return result as { seed: string; signature: string };
  };

  const startNewGame = async (): Promise<boolean> => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    setInitializing(true);
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setPlayerY(SCREEN_HEIGHT / 2);
    setPlayerVelocity(0);
    setObstacles([]);
    seedRef.current = '';
    signatureRef.current = null;

    try {
      const token = await fetchGameToken();
      seedRef.current = token.seed;
      signatureRef.current = token.signature;
      setGameStarted(true);
      return true;
    } catch (error: any) {
      console.error('Error starting game:', error);
      Alert.alert('Błąd', error.message ?? 'Nie udało się rozpocząć gry');
      return false;
    } finally {
      setInitializing(false);
    }
  };

  const endGame = () => {
    setGameOver(true);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  };

  const handleJump = () => {
    if (!gameStarted) {
      if (initializing) {
        return;
      }

      void (async () => {
        const started = await startNewGame();
        if (started) {
          setPlayerVelocity(JUMP_STRENGTH);
        }
      })();
      return;
    }
    if (!gameOver) {
      setPlayerVelocity(JUMP_STRENGTH);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!signatureRef.current || !seedRef.current) {
        throw new Error('Brak ważnego tokenu gry. Spróbuj zagrać ponownie.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/game-submit`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: 'runner',
          score,
          seed: seedRef.current,
          signature: signatureRef.current,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Gratulacje!',
          `Zdobyłeś ${result.stars} gwiazdek!\n${result.packReward ? `Nagroda: Paczka ${result.packReward}` : ''}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Błąd', result.error || 'Nie udało się zapisać wyniku');
      }
    } catch (error: any) {
      console.error('Error submitting score:', error);
      Alert.alert('Błąd', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleJump}
      activeOpacity={1}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={styles.score}>Wynik: {score}</Text>
      </View>

      <View style={styles.gameArea}>
        {!gameStarted && !gameOver && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Tap Runner</Text>
            <Text style={styles.instructionsText}>
              {initializing ? 'Ładowanie gry...' : 'Dotknij ekranu aby skoczyć'}
            </Text>
            {!initializing && (
              <Text style={styles.instructionsText}>Unikaj przeszkód!</Text>
            )}
          </View>
        )}

        {gameOver && (
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>Koniec gry!</Text>
            <Text style={styles.gameOverScore}>Twój wynik: {score}</Text>
            <View style={styles.gameOverButtons}>
              <TouchableOpacity
                style={[styles.retryButton, initializing && styles.submitButtonDisabled]}
                onPress={() => { void startNewGame(); }}
                disabled={initializing}
              >
                <Text style={styles.retryButtonText}>Zagraj ponownie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Wysyłanie...' : 'Zapisz wynik'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {gameStarted && !gameOver && (
          <>
            <View
              style={[
                styles.player,
                {
                  left: 50,
                  top: playerY,
                },
              ]}
            />
            {obstacles.map((obs, index) => (
              <View
                key={index}
                style={[
                  styles.obstacle,
                  {
                    left: obs.x,
                    top: obs.y,
                  },
                ]}
              />
            ))}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  instructions: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 8,
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#fbbf24',
    borderRadius: PLAYER_SIZE / 2,
  },
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  gameOverCard: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  gameOverScore: {
    fontSize: 20,
    color: '#10b981',
    marginBottom: 24,
  },
  gameOverButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
