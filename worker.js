export default {
  async fetch(request, env) {
    // Jere CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // 1. ANALIZ IMAJ (amelyore ak nouvo modèl ak base64)
      if (url.pathname === "/analize-imaj" && request.method === "POST") {
        let contentType = request.headers.get("Content-Type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          return new Response(JSON.stringify({ error: "Fichye a dwe yon imaj (content-type image/*)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const blob = await request.blob();
        if (blob.size === 0) {
          return new Response(JSON.stringify({ error: "Fichye imaj vid" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (blob.size > 8 * 1024 * 1024) { // 8MB max
          return new Response(JSON.stringify({ error: "Imaj twò gwo (max 8MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Konvèti nan base64 byen
        const binary = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
        const base64 = btoa(binary);
        const dataUrl = `data:${contentType};base64,${base64}`;

        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Dekri imaj sa a an detay. Bay deskripsyon an premye nan Anglè, epi apre tradui l nan Kreyòl Ayisyen (pa mete anyen lòt bagay)."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ];

        const input = {
          messages,
          max_tokens: 1024
        };

        const response = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", input);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. AUDIO TO TEXT (amelyore ak nouvo modèl ak limit)
      if (url.pathname === "/audio-to-text" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "";
        if (!contentType.startsWith("audio/") && !contentType.startsWith("video/")) {
          return new Response(JSON.stringify({ error: "Fichye a dwe yon audio oswa video" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const blob = await request.blob();
        if (blob.size === 0) {
          return new Response(JSON.stringify({ error: "Fichye audio vid" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (blob.size > 20 * 1024 * 1024) { // 20MB max
          return new Response(JSON.stringify({ error: "Audio twò gwo (max 20MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await blob.arrayBuffer();
        const input = {
          audio: [...new Uint8Array(arrayBuffer)]
        };

        const response = await env.AI.run("@cf/openai/whisper-large-v3-turbo", input);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } catch (e) {
      return new Response(JSON.stringify({ error: "Erè entèn: " + e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Endpoint pa egziste", { status: 404, headers: corsHeaders });
  },
};
