import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";
import { rateLimit } from "express-rate-limit";

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
app.set("trust proxy", 1);
app.use(express.json({ limit: "18mb" }));

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

const ratios = {
  "portrait_16_9": "9:16",
  "square": "1:1",
  "landscape_16_9": "16:9"
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

async function uploadImage(dataUrl, mimeType) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("Le fichier photo n’est pas valide.");
  }
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Format photo non pris en charge. Utilise PNG, JPG ou WebP.");
  const actualMime = match[1];
  if (mimeType && mimeType !== actualMime) throw new Error("Le type de photo ne correspond pas au fichier envoyé.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
    throw new Error("La photo doit peser 12 Mo maximum.");
  }
  return fal.storage.upload(new Blob([bytes], { type: actualMime }));
}

const generationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Limite de créations atteinte. Réessaie dans quelques minutes." }
});

app.post("/api/generate", generationLimiter, async (req, res) => {
  if (!process.env.FAL_KEY) {
    return res.status(503).json({ error: "La clé FAL_KEY n’est pas configurée dans les variables d’environnement Render." });
  }

  const { kind, prompt, ratio = "portrait_16_9", model = "fal-ai/hunyuan-video", image, imageMime, sound } = req.body || {};
  if (!["image", "video"].includes(kind)) return res.status(400).json({ error: "Choisis Image ou Vidéo." });
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "La description est obligatoire." });
  if (prompt.length > 3000) return res.status(400).json({ error: "Description trop longue." });
  if (!Object.hasOwn(ratios, ratio)) return res.status(400).json({ error: "Format d’image invalide." });

  try {
    const imageUrl = image ? await uploadImage(image, imageMime) : null;

    if (kind === "image") {
      const input = { prompt: prompt.trim(), image_size: ratio, num_images: 1, output_format: "jpeg" };
      const endpoint = imageUrl ? "fal-ai/flux-1/dev/image-to-image" : "fal-ai/flux-1/dev";
      if (imageUrl) input.image_url = imageUrl;
      const result = await fal.queue.submit(endpoint, { input });
      return res.json({ requestId: result.request_id, endpoint, kind: "image" });
    }

    let endpoint;
    let input = { prompt: prompt.trim() };
    if (model === "bytedance/seedance-2.0/image-to-video") {
      if (!imageUrl) return res.status(400).json({ error: "Pour utiliser Seedance, ajoute une photo à animer." });
      endpoint = model;
      input = {
        ...input,
        image_url: imageUrl,
        resolution: "720p",
        aspect_ratio: ratios[ratio],
        generate_audio: Boolean(sound)
      };
    } else if (model === "fal-ai/hunyuan-video") {
      if (imageUrl) return res.status(400).json({ error: "Pour animer une photo, sélectionne Seedance dans le menu Modèle vidéo." });
      endpoint = model;
      input = { ...input, aspect_ratio: ratios[ratio], resolution: "720p" };
    } else {
      return res.status(400).json({ error: "Modèle vidéo non reconnu." });
    }

    const result = await fal.queue.submit(endpoint, { input });
    return res.json({ requestId: result.request_id, endpoint, kind: "video" });
  } catch (error) {
    console.error("fal generation error:", error);
    const message = error?.body?.detail || error?.message || "Erreur fal.ai pendant la génération.";
    return res.status(502).json({ error: String(message).slice(0, 500) });
  }
});


const allowedEndpoints = new Set([
  "fal-ai/flux-1/dev",
  "fal-ai/flux-1/dev/image-to-image",
  "fal-ai/hunyuan-video",
  "bytedance/seedance-2.0/image-to-video"
]);

app.get("/api/status/:kind/:requestId", async (req, res) => {
  if (!process.env.FAL_KEY) return res.status(503).json({ error: "FAL_KEY non configurée sur Render." });
  const { kind, requestId } = req.params;
  const endpoint = String(req.query.endpoint || "");
  if (!["image", "video"].includes(kind) || !allowedEndpoints.has(endpoint) || !/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) {
    return res.status(400).json({ error: "Requête de suivi invalide." });
  }
  try {
    const status = await fal.queue.status(endpoint, { requestId, logs: false });
    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(endpoint, { requestId });
      const media = kind === "image" ? result.data?.images?.[0]?.url : result.data?.video?.url;
      if (!media) return res.status(502).json({ error: "fal.ai a terminé sans retourner de média." });
      return res.json({ status: "COMPLETED", [kind]: media });
    }
    if (status.status === "FAILED") return res.status(502).json({ status: "FAILED", error: "fal.ai n’a pas pu terminer cette génération." });
    return res.json({ status: status.status || "IN_PROGRESS" });
  } catch (error) {
    console.error("fal status error:", error);
    return res.status(502).json({ error: String(error?.message || "Impossible de vérifier la génération.").slice(0, 400) });
  }
});

app.use(express.static(path.join(here, "dist")));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(here, "dist", "index.html")));

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`STIA server listening on ${port}`));
