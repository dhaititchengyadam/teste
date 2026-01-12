export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://ai.adamdh7.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/agree-llama") {
        const input = { prompt: "agree" };
        await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", input);
        return new Response("✅ License accepted successfully! Vision model ready.", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      if (url.pathname === "/analize-imaj" && request.method === "POST") {
        const blob = await request.blob();
        if (blob.size === 0 || blob.size > 10 * 1024 * 1024) { // Max 10MB pou tout imaj
          return new Response(JSON.stringify({ error: "Image empty or too large (max 10MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let contentType = request.headers.get("Content-Type") || "image/png"; // Fallback pou tout kalite

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:${contentType};base64,${base64}`;

        const messages = [
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
        ];

        const input = { messages, max_tokens: 1024 };

        const response = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", input);

        return new Response(JSON.stringify({ response: response.response }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/audio-to-text" && request.method === "POST") {
        const blob = await request.blob();
        if (blob.size === 0 || blob.size > 30 * 1024 * 1024) { // Max 30MB sou gratis
          return new Response(JSON.stringify({ error: "Audio empty or too large (max 30MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        const input = { audio: base64 };

        const response = await env.AI.run("@cf/openai/whisper-large-v3-turbo", input);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/text-to-speech" && request.method === "POST") {
        const { text } = await request.json();

        if (!text || text.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Valid text required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Pa gen limit sou longè – modèl la ap okipe
        const input = { prompt: text };

        const response = await env.AI.run("@cf/myshell-ai/melotts", input);

        const audioBase64 = response.audio;

        if (!audioBase64 || typeof audioBase64 !== "string") {
          throw new Error("Invalid audio response from model");
        }

        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return new Response(bytes, {
          headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
        });
      }

    } catch (e) {
      const errorMsg = e.message || "Unknown error";
      if (errorMsg.includes("5016")) {
        return new Response(JSON.stringify({ error: "License not accepted yet." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Internal error: " + errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Endpoint not found", { status: 404, headers: corsHeaders });
  },
};
