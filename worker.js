const MODELS = {
  VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
  WHISPER: "@cf/openai/whisper-large-v3-turbo",
  TTS: "@cf/deepgram/aura-2-en"
};

function imageToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
      "https://ai.adamdh7.org",
      "https://fondend.pages.dev",
      "http://127.0.0.1:5500"
    ];
    
    const isAllowed = allowedOrigins.includes(origin) || !origin;

    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/agree-llama") {
        await env.AI.run(MODELS.VISION, { prompt: "agree" });
        return new Response("Ready", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      if (url.pathname === "/analize-imaj" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "image/png";
        const buffer = await request.arrayBuffer();
        const base64 = imageToBase64(buffer);
        const response = await env.AI.run(MODELS.VISION, {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze image in detail." },
                { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } }
              ]
            }
          ]
        });
        return Response.json({ response: response.response }, { headers: corsHeaders });
      }

      if (url.pathname === "/audio-to-text" && request.method === "POST") {
        const buffer = await request.arrayBuffer();
        
        if (buffer.byteLength === 0) {
          return Response.json({ error: "Empty audio" }, { status: 400, headers: corsHeaders });
        }

        const audioData = Array.from(new Uint8Array(buffer));
        
        const response = await env.AI.run(MODELS.WHISPER, {
          audio: audioData
        });

        return Response.json(response, { headers: corsHeaders });
      }

      if (url.pathname === "/text-to-speech" && request.method === "POST") {
        const { text } = await request.json();
        const audioStream = await env.AI.run(MODELS.TTS, { text, speaker: "orion" });
        return new Response(audioStream, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
      }

    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
