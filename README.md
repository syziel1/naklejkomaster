# Naklejkomaster MVP

Mobilno-webowa aplikacja kolekcjonerska kart z wyzwaniami, mini-grami i wymianą przez QR kody.

## Funkcje MVP

- Rejestracja i logowanie użytkowników (email + hasło)
- Kolekcja wirtualnych kart z różnymi rzadkościami (common, rare, epic)
- System wyzwań dziennych i tygodniowych
- **Wymiana kart przez QR kod** (jednorazowe, bezpieczne kody z 2-minutowym TTL)
- Mini-gra Runner (unikaj przeszkód, zdobywaj punkty)
- Grywalizacja: XP, poziomy, serie logowań
- System paczek i loot table

## Technologie

- **Frontend**: React Native (Expo) + TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth (email/password)
- **Baza danych**: PostgreSQL z Row Level Security (RLS)

## Szybki start (5 kroków)

### 1. Instalacja zależności

```bash
npm install
```

### 2. Konfiguracja Supabase

Zmienne środowiskowe aplikacji są już skonfigurowane w pliku `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://dbayfxzkmaunafrrkpgw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=twój_anon_key
```

### 3. Zastosuj migracje (już wykonane)

Edge Functions wymagają dodatkowo tajnego klucza HMAC do podpisywania jednorazowych ofert QR. Klucz nie powinien być przechowywany w repozytorium – ustaw go jako sekret środowiskowy w Supabase i rotuj poza kodem, np. za pomocą Supabase CLI:

```bash
supabase secrets set QR_HMAC_SECRET="super-bezpieczny-klucz"
```

Po aktualizacji klucza uruchom ponownie funkcję (deploy) aby wczytała nową wartość.

Baza danych została już skonfigurowana z następującymi tabelami:
- `users_extended` - rozszerzenie auth.users
- `profiles` - profile użytkowników z XP i poziomami
- `cards` - katalog kart
- `user_cards` - kolekcje użytkowników
- `challenges` - wyzwania
- `challenge_claims` - odebrane nagrody
- `qr_offers` - oferty wymiany
- `loot_tables` - tabele dropów
- `match_results` - wyniki gier
- `events` - logi audytu

### 4. Seed danych (już wykonany)

Baza zawiera:
- 10 kart startowych (Profesor Bazyl, Iskierka, Grizzlytron, etc.)
- 3 loot tables (common, rare, epic)
- 5 przykładowych wyzwań

### 5. Uruchom aplikację

```bash
npm run dev
```

Skanuj kod QR w Expo Go lub otwórz w przeglądarce.

## Struktura projektu

```
/app
  /(tabs)            # Główna nawigacja
    index.tsx        # Ekran startowy
    cards.tsx        # Lista kart
    challenges.tsx   # Wyzwania
    trade.tsx        # Wymiana QR
  /auth              # Ekrany auth
    sign-in.tsx
    sign-up.tsx
  /game              # Mini-gry
    runner.tsx       # Tap Runner
  _layout.tsx        # Root layout

/supabase/functions  # Edge Functions
  /mint              # Otwieranie paczek
  /qr-create         # Generowanie QR
  /qr-accept         # Akceptacja wymiany
  /game-submit       # Zapisywanie wyników

/lib
  supabase.ts        # Klient Supabase
  types.ts           # TypeScript types
  starter-cards.ts   # Karty startowe

/contexts
  AuthContext.tsx    # Context autentykacji

/scripts
  seed.sql           # Dane startowe
```

## Kluczowe ekrany

### 1. Home (Start)
- Podsumowanie profilu (XP, poziom, seria)
- Szybki dostęp do sekcji
- Progress bar do następnego poziomu

### 2. Cards (Karty)
- Siatka kart użytkownika
- Filtry po rzadkości
- Statystyki kart (HP, Energy, Level)

### 3. Challenges (Wyzwania)
- Lista wyzwań daily/weekly
- Odbieranie nagród (paczki, XP)
- Integracja z Edge Function `mint`

### 4. Trade (Wymiana)
- Wybór karty do wymiany
- Generowanie QR kodu (TTL 120s, HMAC)
- Skaner QR do akceptacji
- Atomowa wymiana po stronie serwera

### 5. Runner Game
- Prosta gra unikania przeszkód
- Wynik → gwiazdki (0-3)
- 2+ gwiazdki = nagroda (paczka)
- Anti-cheat: hash weryfikacja

## Edge Functions API

### POST /functions/v1/mint
```json
{
  "challengeId": "uuid"
}
```
Zwraca nowe karty z loot table.

### POST /functions/v1/qr-create
```json
{
  "cardInstanceId": "uuid"
}
```
Generuje ofertę QR z HMAC.

### POST /functions/v1/qr-accept
```json
{
  "offerId": "uuid",
  "consumerCardInstanceId": "uuid"
}
```
Atomowo zamienia właścicieli kart.

### POST /functions/v1/game-submit
```json
{
  "game": "runner",
  "score": 850,
  "seed": "timestamp",
  "clientHash": "sha256"
}
```
Waliduje i zapisuje wynik gry.

## Bezpieczeństwo

- **RLS**: Wszystkie tabele mają Row Level Security
- **QR**: Jednorazowe kody z HMAC-SHA256, TTL 120s
- **Anti-cheat**: Hash weryfikacja wyników gier
- **Atomic swaps**: Wymiana kart przez Edge Function z rolą service_role
- **GDPR**: Minimalne dane, role child/guardian

## Starter Pack

Nowy użytkownik automatycznie otrzymuje 5 kart:
1. Robo-Pączek (common)
2. Magiczny Grzyb (common)
3. Robo-Pszczoła (common)
4. Ninja Kot (rare)
5. Grizzlytron (rare)

## Karty w systemie (10 sztuk)

### Epic (4)
- Profesor Bazyl (HP: 420, EN: 150)
- Iskierka (HP: 500, EN: 120)
- Kapitan Burza (HP: 450, EN: 180)
- Cyber Smok (HP: 480, EN: 170)

### Rare (3)
- Grizzlytron (HP: 380, EN: 140)
- Ninja Kot (HP: 300, EN: 160)
- Mała Alchemiczka (HP: 320, EN: 135)

### Common (3)
- Robo-Pączek (HP: 250, EN: 100)
- Magiczny Grzyb (HP: 200, EN: 110)
- Robo-Pszczoła (HP: 220, EN: 95)

## Testowanie wymiany QR

### Scenariusz testowy:
1. Zarejestruj dwa konta (A i B)
2. Zaloguj się na koncie A
3. Przejdź do Trade → wybierz kartę → "Generuj QR"
4. Zaloguj się na koncie B (inne urządzenie/przeglądarka)
5. Przejdź do Trade → wybierz swoją kartę → "Skanuj QR"
6. Zeskanuj kod z urządzenia A
7. Wymiana powinna się zakończyć sukcesem

## Build web

```bash
npm run build:web
```

Wyjście w `dist/`.

## Build native (EAS)

```bash
npx eas-cli build --platform android --profile preview
```

## Znane ograniczenia MVP

- Brak realtime notifications dla wymiany
- Prosta weryfikacja wyzwań (auto-approve)
- Jedna mini-gra (Runner)
- Brak craftingu (połączenie duplikatów)
- Brak rankingów
- Brak znajomych/invite codes

## Następne kroki (post-MVP)

1. Druga mini-gra (Memory)
2. Crafting system (10 duplikatów → wyższa rzadkość)
3. Realtime trade notifications
4. Rankingi tygodniowe
5. System znajomych
6. Push notifications
7. Animacje kart
8. Dźwięki i muzyka

## Wsparcie

Dla problemów z:
- **Supabase**: sprawdź logi w Dashboard > Logs
- **Edge Functions**: sprawdź `/functions` logs
- **RLS**: użyj `auth.uid()` do debugowania w SQL Editor

## Licencja

MVP projekt edukacyjny.
