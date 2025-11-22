import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { id, base64 } = req.body;

    if (!id || !base64) {
      return res.status(400).json({ error: "Faltan parámetros: id o base64" });
    }

    // Inicializar Octokit con tu token de GitHub
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const owner = "JcnNoriega20";
    const repo = "fotos-accesos";
    const path = `${id}.jpg`;

    // Subir archivo al repositorio
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Foto subida automáticamente: ${id}`,
      content: base64,
    });

    const url = `https://raw.githubuserconten
