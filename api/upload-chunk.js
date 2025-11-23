import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

export const config = {
  api: {
    bodyParser: false, // 📌 MUY IMPORTANTE: NO usar bodyParser, recibimos binario
  },
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = "JcnNoriega20";
const REPO = "fotos-accesos";

// =============================
// 📌 Función para leer el RAW
// =============================
const readRawBody = async (req) => {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);

    req.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    req.on("end", () => resolve(data));
    req.on("error", (err) => reject(err));
  });
};

// =============================
// 📌 API HANDLER
// =============================
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  try {
    // ======== Leer parámetros desde query ========
    const id = req.query.id;
    const index = parseInt(req.query.index);
    const total = parseInt(req.query.total);
    const size = parseInt(req.query.size);

    if (!id || isNaN(index) || isNaN(total) || isNaN(size)) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    // ======= Leer chunk RAW (binario) =======
    const buffer = await readRawBody(req);

    if (buffer.length !== size) {
      return res.status(400).json({
        error: "Tamaño de chunk incorrecto",
        recibido: buffer.length,
        esperado: size,
      });
    }

    console.log(`📥 Chunk ${index + 1}/${total} recibido (${buffer.length} bytes)`);

    // Carpeta temporal por ID
    const tempDir = path.join("/tmp", id);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const chunkPath = path.join(tempDir, `chunk_${index}.bin`);
    fs.writeFileSync(chunkPath, buffer);

    // Si no es el último fragmento → FIN
    if (index < total - 1) {
      return res.json({ ok: true, received: index });
    }

    // ==============================
    // 🧩 Reconstruir JPG completo
    // ==============================
    let fullImage = Buffer.alloc(0);

    for (let i = 0; i < total; i++) {
      const part = fs.readFileSync(path.join(tempDir, `chunk_${i}.bin`));
      fullImage = Buffer.concat([fullImage, part]);
    }

    // Limpiar temporales
    fs.rmSync(tempDir, { recursive: true, force: true });

    // ==============================
    // 🚀 Subir a GitHub
    // ==============================
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
    console.error("❌ ERROR GENERAL:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
}
