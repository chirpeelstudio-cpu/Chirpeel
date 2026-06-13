// ElevenLabs TTS — streams MP3 audio for the AI assistant voice mode.
// Public function (verify_jwt = false) so it can be called from the browser
// without an extra auth handshake. Rate limit by trimming text length.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah — warm & friendly
const MAX_TEXT_LEN = 1500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text?: string; voiceId?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawText = (body?.text ?? "").trim();
  if (!rawText) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = rawText.length > MAX_TEXT_LEN ? rawText.slice(0, MAX_TEXT_LEN) : rawText;
  const voiceId = body?.voiceId || DEFAULT_VOICE;

  const elevenResp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.05,
        },
      }),
    },
  );

  if (!elevenResp.ok || !elevenResp.body) {
    const detail = await elevenResp.text().catch(() => "");
    return new Response(JSON.stringify({ error: `TTS failed (${elevenResp.status})`, detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(elevenResp.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
});