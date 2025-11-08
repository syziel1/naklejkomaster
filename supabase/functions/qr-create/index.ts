import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QRCreateRequest {
  cardInstanceId: string;
}

async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { cardInstanceId }: QRCreateRequest = await req.json();

    const { data: userCard, error: cardError } = await supabase
      .from("user_cards")
      .select("*, cards(*)")
      .eq("id", cardInstanceId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (cardError || !userCard) {
      return new Response(
        JSON.stringify({ error: "Card not found or not owned by user" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const offerId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 120000).toISOString();

    const secret = Deno.env.get("QR_HMAC_SECRET");
    if (!secret) {
      console.error("QR create misconfiguration: QR_HMAC_SECRET is not set");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const payload = `${offerId}|${user.id}|${cardInstanceId}|${timestamp}`;
    const hmac = await generateHMAC(payload, secret);

    const { error: insertError } = await supabase
      .from("qr_offers")
      .insert({
        id: offerId,
        owner_id: user.id,
        card_instance_id: cardInstanceId,
        hmac: hmac,
        expires_at: expiresAt,
        timestamp_used: timestamp,
      });

    if (insertError) {
      throw insertError;
    }

    await supabase
      .from("events")
      .insert({
        user_id: user.id,
        event_type: "qr_create",
        event_data: {
          offer_id: offerId,
          card_instance_id: cardInstanceId,
        },
      });

    const qrPayload = {
      offerId,
      sig: hmac,
    };

    return new Response(
      JSON.stringify({
        success: true,
        offerId,
        qrPayload: JSON.stringify(qrPayload),
        ttl: 120,
        expiresAt,
        card: userCard.cards,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("QR create error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
