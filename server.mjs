// server.mjs — Backend Origen Neri (Render + Mercado Pago)
// ESM (import) para que Render no rompa con "require is not defined"

import express from "express";
import cors from "cors";
import MercadoPago from "mercadopago";

const app = express();

// Render expone el puerto por la env var PORT
const PORT = process.env.PORT || 10000;

// ⚠️ Token: preferí ponerlo en una variable de entorno en Render (MP_ACCESS_TOKEN).
// Si no está seteado, usa el fallback de abajo (puede quedar en blanco si ya seteaste el env var).
const MP_ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441"; // ← tu token por si aún no cargaste el ENV

// Instancia del SDK de Mercado Pago
const mp = new MercadoPago({ accessToken: MP_ACCESS_TOKEN });

app.use(cors());
app.use(express.json());

// Ping simple
app.get("/", (_req, res) => {
  res.send("OK: Origen Neri MP backend");
});

// Crear preferencia de pago
app.post("/api/checkout", async (req, res) => {
  try {
    const { items = [], buyer = {} } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items_required" });
    }

    // Normalizo items
    const mpItems = items.map((it) => ({
      title: String(it.title),
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      currency_id: "ARS",
    }));

    // URL base pública del backend (Render la expone como env var)
    const base =
      process.env.RENDER_EXTERNAL_URL ||
      "https://origen-neri-mp-backend.onrender.com";

    const pref = await mp.preferences.create({
      items: mpItems,
      payer: {
        name: buyer?.name || undefined,
        email: buyer?.email || undefined,
      },
      back_urls: {
        success: "https://origenneri.com.ar/pago-exitoso",
        failure: "https://origenneri.com.ar/pago-fallido",
        pending: "https://origenneri.com.ar/pago-pendiente",
      },
      auto_return: "approved",
      notification_url: `${base}/api/webhook`,
      statement_descriptor: "ORIGEN NERI",
      binary_mode: true,
    });

    // URL para redirigir al checkout
    const url =
      pref?.body?.init_point ||
      pref?.body?.sandbox_init_point ||
      pref?.init_point;

    if (!url) {
      return res
        .status(500)
        .json({ error: "mp_no_url", detail: pref?.body || pref });
    }

    return res.json({ url, preference_id: pref.body.id });
  } catch (err) {
    console.error("MP error:", err);
    return res.status(500).json({
      error: "mp_error",
      message: err?.message || "unknown",
    });
  }
});

// Webhook (por ahora solo loguea y responde 200)
app.post("/api/webhook", (req, res) => {
  try {
    console.log("Webhook MP:", JSON.stringify(req.body));
  } catch {}
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`MP backend listening on ${PORT}`);
});
