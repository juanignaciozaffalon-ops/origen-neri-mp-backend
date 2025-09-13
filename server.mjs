import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

const PORT = process.env.PORT || 10000;
const ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441";

mercadopago.configure({ access_token: ACCESS_TOKEN });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Origen Neri MP funcionando ✅");
});

app.post("/api/checkout", async (req, res) => {
  try {
    const { items = [], buyer = {} } = req.body;

    const preference = {
      items: items.map((it) => ({
        title: String(it.title),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        currency_id: "ARS"
      })),
      payer: {
        name: buyer.name || "",
        email: buyer.email || ""
      },
      back_urls: {
        success: "https://origenneri.com/success",
        failure: "https://origenneri.com/failure",
        pending: "https://origenneri.com/pending"
      },
      auto_return: "approved"
    };

    const result = await mercadopago.preferences.create(preference);
    return res.json({ url: result.body.init_point });
  } catch (err) {
    console.error("Error en /api/checkout:", err);
    res.status(500).json({ error: "Error al crear la preferencia" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
