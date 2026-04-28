export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, mimeType } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              },
              {
                text: `Analiza esta foto de pesca deportiva. En la imagen hay una lobina (bass) y una pelota roja de exactamente 3 cm de diámetro usada como referencia de medición.

Tu tarea:
1. Detecta la pelota roja de referencia (3 cm de diámetro)
2. Detecta la lobina y mide su largo total de punta a punta (boca a cola)
3. Calcula cuántas pelotas caben a lo largo de la lobina
4. Multiplica por 3 cm para obtener el largo real

Responde SOLO con un JSON válido, sin texto adicional ni backticks:
{
  "pelota_encontrada": true,
  "pez_encontrado": true,
  "largo_cm": 35.5,
  "pelotas_que_caben": 11.8,
  "confianza": "alta",
  "notas": "observacion breve"
}`
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    try {
      const result = JSON.parse(text.replace(/```json|```/g, "").trim());
      res.status(200).json(result);
    } catch {
      res.status(200).json({ pelota_encontrada: false, pez_encontrado: false, largo_cm: null, notas: "Error al parsear respuesta" });
    }
  } catch (error) {
    res.status(500).json({ pelota_encontrada: false, pez_encontrado: false, largo_cm: null, notas: "Error de servidor: " + error.message });
  }
}
