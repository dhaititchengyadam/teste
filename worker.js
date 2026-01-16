const MODELS = {
  VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
  WHISPER: "@cf/openai/whisper-large-v3-turbo",
  TTS: "@cf/deepgram/aura-2-en"
};

function toBase64(buffer) {
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
    const allowedOrigins = ["https://ai.adamdh7.org", "https://fondend.pages.dev"];
    const isAllowed = allowedOrigins.includes(origin);

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
        return new Response("✅ License accepted", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      if (url.pathname === "/analize-imaj" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "image/png";
        const buffer = await request.arrayBuffer();

        if (buffer.byteLength === 0 || buffer.byteLength > 10 * 1024 * 1024) {
          return Response.json({ error: "Image invalid or >10MB" }, { status: 400, headers: corsHeaders });
        }

        const base64 = toBase64(buffer);
        const dataUrl = `data:${contentType};base64,${base64}`;

        const response = await env.AI.run(MODELS.VISION, {
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image in extreme detail. If there are people or faces, describe them thoroughly: physical appearance, apparent age, gender, facial expression, emotions, clothing, pose, and if they resemble any known celebrity or person (give name if confident). Also describe the background, dominant colors, lighting, composition, photographic style, overall atmosphere, objects present, and any text. Provide a rich, professional-level visual description in English only."
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl }
                }
              ]
            }
          ],
          max_tokens: 1024
        });

        return Response.json({ response: response.response }, { headers: corsHeaders });
      }

      if (url.pathname === "/audio-to-text" && request.method === "POST") {
        const buffer = await request.arrayBuffer();

        if (buffer.byteLength === 0 || buffer.byteLength > 30 * 1024 * 1024) {
          return Response.json({ error: "Audio invalid or >30MB" }, { status: 400, headers: corsHeaders });
        }

        const response = await env.AI.run(MODELS.WHISPER, {
          audio: [...new Uint8Array(buffer)]
        });

        return Response.json(response, { headers: corsHeaders });
      }

      if (url.pathname === "/text-to-speech" && request.method === "POST") {
        const { text } = await request.json();

        if (!text?.trim()) {
          return Response.json({ error: "Valid text required" }, { status: 400, headers: corsHeaders });
        }

        const audioStream = await env.AI.run(MODELS.TTS, { 
          text: text,
          speaker: "orion"
        });

        return new Response(audioStream, {
          headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
        });
      }

    } catch (e) {
      const msg = e.message || "";
      return Response.json(
        { error: msg },
        { status: msg.includes("5016") ? 403 : 500, headers: corsHeaders }
      );
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
