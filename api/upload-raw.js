// ==========================
//    upload-raw.js (ESM)
// ==========================

import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = "JcnNoriega20";
const REPO = "fotos-accesos";

const readRawBody = async (req) => {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);

    req.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  try {
    const { id, index, total, size } = req.query;

    const chunkIndex = parseInt(index);
    const totalChunks = parseInt(total);
    const chunkSize = parseInt(size);

    if (!id || isNaN(chunkIndex) || isNaN(totalChunks) || isNaN(chunkSize)) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const buffer = await readRawBody(req);

    if (buffer.length !== chunkSize) {
      return res.status(400).json({
        error: "Tamaño incorrecto",
        esperado: chunkSize,
        recibido: buffer.length,
      });
    }

    console.log(`📥 RECIBIDO chunk ${chunkIndex + 1}/${totalChunks}`);

    const tempDir = path.join("/tmp", id);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    fs.writeFileSync(
      path.join(tempDir, `chunk_${chunkIndex}.bin`),
      buffer
    );

    if (chunkIndex < totalChunks - 1) {
      return res.json({ ok: true, received: chunkIndex });
    }

    // =============================
    // RECONSTRUIR IMAGEN
    // =============================
    let fullImage = Buffer.alloc(0);

    for (let i = 0; i < totalChunks; i++) {
      const part = fs.readFileSync(path.join(tempDir, `chunk_${i}.bin`));
      fullImage = Buffer.concat([fullImage, part]);
    }

    fs.rmSync(tempDir, { recursive: true, force: true });

    // =============================
    // SUBIR A GITHUB
    // =============================
    const filePath = `fotos/${id}.jpg`;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `Foto acceso ${id}`,
      content: fullImage.toString("base64"),
    });

    const publicURL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePath}`;

    console.log("📤 Imagen subida:", publicURL);

    return res.json({ ok: true, url: publicURL });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
}
