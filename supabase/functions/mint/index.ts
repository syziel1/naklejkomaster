import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MintRequest {
  challengeId: string;
}

interface LootTable {
  pack_type: string;
  table_json: {
    cards: Array<{
      card_id: string;
      weight: number;
    }>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { challengeId }: MintRequest = await req.json();

    const { data: claim, error: claimError } = await supabase
      .from("challenge_claims")
      .select("*, challenges(*)")
      .eq("id", challengeId)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();

    if (claimError || !claim) {
      return new Response(
        JSON.stringify({ error: "Invalid or unapproved challenge claim" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const challenge = claim.challenges as any;
    const rewardType = challenge.reward_type;
    const rewardValue = challenge.reward_value;

    let newCards: any[] = [];

    if (rewardType === "pack") {
      const { data: lootTable, error: lootError } = await supabase
        .from("loot_tables")
        .select("*")
        .eq("pack_type", rewardValue)
        .maybeSingle() as { data: LootTable | null; error: any };

      if (lootError || !lootTable) {
        return new Response(
          JSON.stringify({ error: "Loot table not found" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const cards = lootTable.table_json.cards;
      const totalWeight = cards.reduce((sum, c) => sum + c.weight, 0);
      const random = Math.random() * totalWeight;

      let cumulativeWeight = 0;
      let selectedCardId = cards[0].card_id;

      for (const card of cards) {
        cumulativeWeight += card.weight;
        if (random <= cumulativeWeight) {
          selectedCardId = card.card_id;
          break;
        }
      }

      const { data: newCard, error: insertError } = await supabase
        .from("user_cards")
        .insert({
          owner_id: user.id,
          card_id: selectedCardId,
        })
        .select("*, cards(*)")
        .single();

      if (insertError) {
        throw insertError;
      }

      newCards = [newCard];
    } else if (rewardType === "card") {
      const { data: newCard, error: insertError } = await supabase
        .from("user_cards")
        .insert({
          owner_id: user.id,
          card_id: rewardValue,
        })
        .select("*, cards(*)")
        .single();

      if (insertError) {
        throw insertError;
      }

      newCards = [newCard];
    } else if (rewardType === "xp") {
      const xpAmount = parseInt(rewardValue, 10);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const newXp = (profile?.xp || 0) + xpAmount;
      const newLevel = Math.min(10, Math.floor(newXp / 100) + 1);

      await supabase
        .from("profiles")
        .update({
          xp: newXp,
          level: newLevel,
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          success: true,
          reward: { type: "xp", amount: xpAmount, newXp, newLevel },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("events")
      .insert({
        user_id: user.id,
        event_type: "mint",
        event_data: {
          challenge_id: challengeId,
          reward_type: rewardType,
          cards: newCards.map(c => c.id),
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        cards: newCards,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Mint error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
