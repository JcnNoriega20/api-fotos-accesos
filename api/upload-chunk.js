import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

export const config = {
  api: {
    bodyParser: { sizeLimit: "6mb" }, // > chunks más grandes
  },
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = "JcnNoriega20";
const REPO = "fotos-accesos";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  const { id, chunkIndex, totalChunks, data } = req.body;

  if (!id || chunkIndex === undefined || totalChunks === undefined || !data) {
    return res.status(400).json({
      error: "Faltan parámetros: id, chunkIndex, totalChunks, data",
    });
  }

  // Carpeta temporal única por ID
  const tempDir = path.join("/tmp", id);

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // Guardar fragmento
  const chunkPath = path.join(tempDir, `chunk_${chunkIndex}.txt`);
  fs.writeFileSync(chunkPath, data);

  // Si aún no es el último fragmento
  if (chunkIndex < totalChunks - 1) {
    return res.json({ ok: true, receivedChunk: chunkIndex });
  }

  // === RECONSTRUIR ===
  let fullBase64 = "";
  for (let i = 0; i < totalChunks; i++) {
    const p = path.join(tempDir, `chunk_${i}.txt`);
    fullBase64 += fs.readFileSync(p, "utf8");
  }

  // Limpiar archivos temporales
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Convertir Base64 → binario
  const imgBuffer = Buffer.from(fullBase64, "base64");

  const filePath = `fotos/${id}.jpg`;

  // Subir a GitHub
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: filePath,
    message: `Foto acceso ${id}`,
    content: imgBuffer.toString("base64"),
  });

  const publicURL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePath}`;

  return res.json({
    ok: true,
    url: publicURL,
  });
}
