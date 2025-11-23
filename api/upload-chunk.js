import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
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

  const { id, chunk, index, total } = req.body;

  if (!id || !chunk || index === undefined || total === undefined)
    return res.status(400).json({ error: "Faltan parámetros" });

  // Carpeta temporal por ID
  const tempDir = path.join("/tmp", id);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const chunkPath = path.join(tempDir, `chunk_${index}.txt`);
  fs.writeFileSync(chunkPath, chunk);

  // Si aún no es el último fragmento
  if (index < total - 1)
    return res.json({ ok: true, received: index });

  // === RECONSTRUIR BASE64 COMPLETO ===
  let fullBase64 = "";
  for (let i = 0; i < total; i++) {
    const p = path.join(tempDir, `chunk_${i}.txt`);
    fullBase64 += fs.readFileSync(p, "utf8");
  }

  // Limpiar después
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

  res.json({ ok: true, url: publicURL });
}
