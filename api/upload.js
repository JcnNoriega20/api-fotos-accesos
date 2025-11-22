export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { id, base64 } = req.body;

    if (!id || !base64) {
      return res.status(400).json({ error: "Faltan parámetros (id o base64)" });
    }

    const token = process.env.GITHUB_TOKEN;
    const username = "JcnNoriega20";       // tu usuario GitHub
    const repo = "fotos-accesos";          // repo donde van las fotos

    const filePath = `fotos/${id}.jpg`;
    const content = base64.replace(/^data:image\/jpeg;base64,/, "");

    // Construir objeto para GitHub API
    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;

    const commitMessage = `Foto subida desde ESP32-CAM ID ${id}`;

    const body = {
      message: commitMessage,
      content: content,
      branch: "main"
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const githubResult = await response.json();

    if (response.status >= 400) {
      console.log(githubResult);
      return res.status(500).json({ error: "Error subiendo a GitHub", details: githubResult });
    }

    const finalURL = githubResult.content.download_url;

    return res.status(200).json({
      status: "OK",
      id,
      url: finalURL
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
}
