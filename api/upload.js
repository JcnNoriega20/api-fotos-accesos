import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

let app;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    if (!app) {
      const firebaseKey = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

      app = initializeApp({
        credential: cert(firebaseKey),
        databaseURL: "https://proyectopas-d1fae-default-rtdb.firebaseio.com/"
      });
    }

    const db = getDatabase();

    const { id, foto } = req.body;

    if (!id || !foto)
      return res.status(400).json({ error: "Falta id o foto base64" });

    await db.ref("foto_acceso/" + id).set({
      foto: foto,
      timestamp: Date.now()
    });

    return res.status(200).json({ status: "OK" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
}
