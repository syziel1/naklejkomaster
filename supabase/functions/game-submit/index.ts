import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GameSubmitRequest {
  game: "runner" | "memory";
  score: number;
  seed: string;
  clientHash: string;
}

async function calculateHash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateStars(game: string, score: number): number {
  if (game === "runner") {
    if (score >= 1000) return 3;
    if (score >= 500) return 2;
    if (score >= 200) return 1;
    return 0;
  } else if (game === "memory") {
    if (score <= 20) return 3;
    if (score <= 35) return 2;
    if (score <= 50) return 1;
    return 0;
  }
  return 0;
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

    const { game, score, seed, clientHash }: GameSubmitRequest = await req.json();

    const serverHash = await calculateHash(`${game}|${score}|${seed}|${user.id}`);

    if (serverHash !== clientHash) {
      await supabase
        .from("events")
        .insert({
          user_id: user.id,
          event_type: "game_cheat_attempt",
          event_data: {
            game,
            score,
            seed,
            client_hash: clientHash,
            server_hash: serverHash,
          },
        });

      return new Response(
        JSON.stringify({ error: "Hash verification failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stars = calculateStars(game, score);

    const { data: result, error: insertError } = await supabase
      .from("match_results")
      .insert({
        user_id: user.id,
        game,
        score,
        seed,
        proof: clientHash,
        stars,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    let packReward = null;
    if (stars >= 2) {
      const packType = stars === 3 ? "rare" : "common";
      packReward = packType;
    }

    await supabase
      .from("events")
      .insert({
        user_id: user.id,
        event_type: "game_complete",
        event_data: {
          game,
          score,
          stars,
          pack_reward: packReward,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        result,
        stars,
        packReward,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Game submit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
