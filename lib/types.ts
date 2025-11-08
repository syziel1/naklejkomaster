export type UserRole = 'child' | 'guardian';
export type CardRarity = 'common' | 'rare' | 'epic';
export type ChallengePeriod = 'daily' | 'weekly';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type PackType = 'common' | 'rare' | 'epic';
export type GameType = 'runner' | 'memory';

export interface Card {
  id: string;
  slug: string;
  name: string;
  rarity: CardRarity;
  series: string;
  description: string | null;
  image_url: string | null;
  hp: number;
  energy: number;
  abilities: Ability[];
  created_at: string;
}

export interface Ability {
  name: string;
  description: string;
  icon?: string;
}

export interface UserCard {
  id: string;
  owner_id: string;
  card_id: string;
  level: number;
  acquired_at: string;
  created_at: string;
  cards?: Card;
}

export interface Profile {
  user_id: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  level: number;
  updated_at: string;
}

export interface UserExtended {
  id: string;
  handle: string;
  role: UserRole;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  periodic: ChallengePeriod;
  rule_json: Record<string, any>;
  reward_type: string;
  reward_value: string;
  active: boolean;
  created_at: string;
}

export interface ChallengeClaim {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ClaimStatus;
  proof_data: Record<string, any> | null;
  created_at: string;
  reviewed_at: string | null;
  challenges?: Challenge;
}

export interface QRPayload {
  offerId: string;
  sig: string;
}

export interface MatchResult {
  id: string;
  user_id: string;
  game: GameType;
  score: number;
  seed: string;
  proof: string;
  stars: number;
  created_at: string;
}
