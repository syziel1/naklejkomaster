import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QRAcceptRequest {
  offerId: string;
  consumerCardInstanceId: string;
  sig: string;
}

async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const normalizedSignature = signature.toLowerCase();
  if (normalizedSignature.length % 2 !== 0) {
    return false;
  }
  const signatureChunks = normalizedSignature.match(/.{1,2}/g);
  if (!signatureChunks) {
    return false;
  }

  const signatureBytes = new Uint8Array(signatureChunks.map(byte => parseInt(byte, 16)));
  return await crypto.subtle.verify("HMAC", key, signatureBytes, messageData);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { offerId, consumerCardInstanceId, sig }: QRAcceptRequest = await req.json();

    if (!sig) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: offer, error: offerError } = await supabaseAnon
      .from("qr_offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle();

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ error: "Offer not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (offer.consumed_at) {
      return new Response(
        JSON.stringify({ error: "Offer already consumed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (new Date(offer.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Offer expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (offer.owner_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot trade with yourself" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const secret = Deno.env.get("QR_HMAC_SECRET") ?? "default-secret-change-in-production";
    const payload = `${offerId}|${offer.owner_id}|${offer.card_instance_id}|${offer.created_at}`;
    const isSignatureValid = await verifyHMAC(payload, sig, secret);

    if (!isSignatureValid || offer.hmac !== sig) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: consumerCard, error: consumerCardError } = await supabaseAnon
      .from("user_cards")
      .select("*")
      .eq("id", consumerCardInstanceId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (consumerCardError || !consumerCard) {
      return new Response(
        JSON.stringify({ error: "Consumer card not found or not owned" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateOwnerError } = await supabaseAdmin
      .from("user_cards")
      .update({ owner_id: user.id })
      .eq("id", offer.card_instance_id);

    if (updateOwnerError) {
      throw new Error("Failed to transfer owner card");
    }

    const { error: updateConsumerError } = await supabaseAdmin
      .from("user_cards")
      .update({ owner_id: offer.owner_id })
      .eq("id", consumerCardInstanceId);

    if (updateConsumerError) {
      await supabaseAdmin
        .from("user_cards")
        .update({ owner_id: offer.owner_id })
        .eq("id", offer.card_instance_id);

      throw new Error("Failed to transfer consumer card, rolled back");
    }

    const { error: markConsumedError } = await supabaseAdmin
      .from("qr_offers")
      .update({
        consumed_at: new Date().toISOString(),
        consumer_id: user.id,
      })
      .eq("id", offerId);

    if (markConsumedError) {
      console.error("Failed to mark offer as consumed:", markConsumedError);
    }

    await supabaseAdmin
      .from("events")
      .insert([
        {
          user_id: offer.owner_id,
          event_type: "trade_complete",
          event_data: {
            offer_id: offerId,
            gave: offer.card_instance_id,
            received: consumerCardInstanceId,
            partner: user.id,
          },
        },
        {
          user_id: user.id,
          event_type: "trade_complete",
          event_data: {
            offer_id: offerId,
            gave: consumerCardInstanceId,
            received: offer.card_instance_id,
            partner: offer.owner_id,
          },
        },
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trade completed successfully",
        ownerReceived: consumerCardInstanceId,
        consumerReceived: offer.card_instance_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("QR accept error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
