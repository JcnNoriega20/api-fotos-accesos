import { Octokit } from "@octokit/core";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { id, base64 } = req.body;

    if (!id || !base64) {
      return res.status(400).json({ error: "Falta id o base64" });
    }

    // ⚠️ Tu token va en Vercel → Settings → Environment Variables
    const TOKEN = process.env.GITHUB_TOKEN;

    const octokit = new Octokit({ auth: TOKEN });

    const path = `${id}.jpg`;

    // Subir archivo a GitHub
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: "JcnNoriega20",
      repo: "fotos-accesos",
      path: path,
      message: `Subiendo foto ${id}`,
      content: base64
    });

    const url = `https://raw.githubusercontent.com/JcnNoriega20/fotos-accesos/main/${path}`;

    return res.status(200).json({
      ok: true,
      url
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "No se pudo subir la imagen",
      details: error.message
    });
  }
}
