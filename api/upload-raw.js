import { Octokit } from "@octokit/rest";

export const config = {
  api: { bodyParser: false }, // ✅ necesitamos RAW
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = "JcnNoriega20";
const REPO = "fotos-accesos";

// leer body raw
const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);

    req.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Falta id" });

    const imgBuffer = await readRawBody(req);

    if (!imgBuffer || imgBuffer.length === 0) {
      return res.status(400).json({ error: "Imagen vacía" });
    }

    const filePath = `fotos/${id}.jpg`;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `Foto acceso ${id}`,
      content: imgBuffer.toString("base64"),
    });

    const publicURL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePath}`;

    return res.json({ ok: true, url: publicURL });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
}
