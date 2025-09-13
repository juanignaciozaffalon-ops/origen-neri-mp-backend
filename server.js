import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ Para probar rápido: usamos el Access Token directamente.
// Más adelante lo movemos a una variable de entorno en Render.
mercadopago.configure({
  access_token: "APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441"
});

// Ruta de salud (para probar que está vivo)
app.get("/", (req, res) => {
  res.send("Backend Origen Neri funcionando 🚀");
});

// Crear preferencia y devolver URL de pago
app.post("/api/checkout", async (req, res) => {
  try {
    const { items, buyer } = req.body;

    const preference = {
      items: (items || []).map((i) => ({
        title: i.title,
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price || 0),
        currency_id: "ARS",
      })),
      payer: {
        name: buyer?.name || "",
        email: buyer?.email || "",
      },
      back_urls: {
        success: "https://origenneri.com/success",
        failure: "https://origenneri.com/failure",
        pending: "https://origenneri.com/pending",
      },
      auto_return: "approved",
      statement_descriptor: "ORIGEN NERI",
    };

    const result = await mercadopago.preferences.create(preference);
    res.json({ url: result.body.init_point });
  } catch (err) {
    console.error("MP error:", err?.message || err);
    res.status(500).json({ error: "Error creando preferencia" });
  }
});

// Render usa este puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
