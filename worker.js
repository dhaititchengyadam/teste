export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // Endpoint espesyal pou aksepte license Llama 3.2 Vision
      if (url.pathname === "/agree-llama") {
        const input = {
          messages: [
            {
              role: "user",
              content: "agree"
            }
          ]
        };
        await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", input);
        return new Response("Ou dakò ak license Meta Llama 3.2 la kounye a! Vision model la pare pou itilize.", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      // 1. ANALIZ IMAJ
      if (url.pathname === "/analize-imaj" && request.method === "POST") {
        let contentType = request.headers.get("Content-Type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          return new Response(JSON.stringify({ error: "Fichye a dwe yon imaj" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const blob = await request.blob();
        if (blob.size === 0 || blob.size > 8 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Imaj vid oswa twò gwo (max 8MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Konvèti an base64
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
                text: "Dekri imaj sa a an detay. Bay deskripsyon an premye nan Anglè, epi apre tradui l nan Kreyòl Ayisyen klè."
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

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. AUDIO TO TEXT
      if (url.pathname === "/audio-to-text" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "";
        if (!contentType.startsWith("audio/") && !contentType.startsWith("video/")) {
          return new Response(JSON.stringify({ error: "Fichye a dwe audio oswa video" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const blob = await request.blob();
        if (blob.size === 0 || blob.size > 25 * 1024 * 1024) { // 25MB pou turbo
          return new Response(JSON.stringify({ error: "Audio vid oswa twò gwo (max 25MB)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Konvèti an base64 string pou modèl turbo
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

    } catch (e) {
      return new Response(JSON.stringify({ error: "Erè entèn: " + e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Endpoint pa egziste", { status: 404, headers: corsHeaders });
  },
};
