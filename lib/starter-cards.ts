export const STARTER_CARD_SLUGS = [
  'robo-paczek',
  'magiczny-grzyb',
  'robo-pszczola',
  'ninja-kot',
  'grizzlytron',
];

export async function grantStarterCards(userId: string, supabase: any) {
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id')
    .in('slug', STARTER_CARD_SLUGS);

  if (cardsError) throw cardsError;

  const userCards = cards.map((card: any) => ({
    owner_id: userId,
    card_id: card.id,
  }));

  const { error: insertError } = await supabase
    .from('user_cards')
    .insert(userCards);

  if (insertError) throw insertError;

  return cards.length;
}
