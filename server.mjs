import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

const app = express();
app.use(cors());
app.use(express.json());

// Configuración Mercado Pago
mercadopago.configure({
  access_token: "APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441"
});

// Ruta checkout
app.post("/api/checkout", async (req, res) => {
  try {
    const { items, buyer } = req.body;
    const preference = {
      items,
      payer: {
        name: buyer?.name,
        email: buyer?.email
      },
      back_urls: {
        success: "https://tuweb.com/success",
        failure: "https://tuweb.com/failure",
        pending: "https://tuweb.com/pending"
      },
      auto_return: "approved"
    };

    const result = await mercadopago.preferences.create(preference);
    res.json({ url: result.body.init_point });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando preferencia" });
  }
});

// Render usa PORT dinámico
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});
