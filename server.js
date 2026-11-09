import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "16mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, falConfigured: Boolean(process.env.FAL_KEY) }));

app.post("/api/generate", async (req, res) => {
  if (!process.env.FAL_KEY) return res.status(503).json({ error: "La clé FAL_KEY n’est pas configurée dans Render." });
  const { kind, prompt, ratio, model, image, sound } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "La description est obligatoire." });
  if (prompt.length > 3000) return res.status(400).json({ error: "Description trop longue." });
  try {
    let result;
    if (kind === "image") {
      const input = { prompt: prompt.trim(), image_size: ratio || "portrait_16_9", num_images: 1 };
      const endpoint = image ? "fal-ai/flux/dev/image-to-image" : "fal-ai/flux/dev";
      if (image) input.image_url = image;
      result = await fal.subscribe(endpoint, { input });
      const url = result.data?.images?.[0]?.url;
      if (!url) throw new Error("Aucune image reçue de fal.ai.");
      return res.json({ image: url, requestId: result.requestId });
    }
    const isImageToVideo = Boolean(image);
    const endpoint = isImageToVideo
      ? "bytedance/seedance-2.0/image-to-video"
      : (model === "bytedance/seedance-2.0/image-to-video" ? "fal-ai/hunyuan-video" : (model || "fal-ai/hunyuan-video"));
    const input = { prompt: prompt.trim() };
    if (isImageToVideo) input.image_url = image;
    if (endpoint === "bytedance/seedance-2.0/image-to-video") input.resolution = "720p";
    if (endpoint === "fal-ai/hunyuan-video" && sound) input.enable_audio = true;
    result = await fal.subscribe(endpoint, { input });
    const url = result.data?.video?.url;
    if (!url) throw new Error("Aucune vidéo reçue de fal.ai.");
    return res.json({ video: url, requestId: result.requestId });
  } catch (error) {
    console.error("fal generation error:", error);
    const message = error?.body?.detail || error?.message || "Erreur fal.ai pendant la génération.";
    return res.status(502).json({ error: String(message).slice(0, 500) });
  }
});

app.use(express.static(path.join(here, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(here, "dist", "index.html")));
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`STIA server listening on ${port}`));
