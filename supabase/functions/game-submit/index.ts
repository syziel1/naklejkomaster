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
  signature: string;
}

const encoder = new TextEncoder();

async function importSignatureKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function verifySignature({
  game,
  seed,
  userId,
  signature,
}: {
  game: string;
  seed: string;
  userId: string;
  signature: string;
}): Promise<boolean> {
  const secret = Deno.env.get("GAME_SIGNATURE_SECRET");
  if (!secret) {
    throw new Error("Missing GAME_SIGNATURE_SECRET environment variable");
  }

  const key = await importSignatureKey(secret);
  const message = `${game}|${seed}|${userId}`;
  const signatureBuffer = base64ToArrayBuffer(signature);

  return crypto.subtle.verify("HMAC", key, signatureBuffer, encoder.encode(message));
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

    const { game, score, seed, signature }: GameSubmitRequest = await req.json();

    const isValidSignature = await verifySignature({
      game,
      seed,
      userId: user.id,
      signature,
    });

    if (!isValidSignature) {
      await supabase
        .from("events")
        .insert({
          user_id: user.id,
          event_type: "game_cheat_attempt",
          event_data: {
            game,
            score,
            seed,
            signature,
            reason: "invalid_signature",
          },
        });

      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
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
        proof: signature,
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
