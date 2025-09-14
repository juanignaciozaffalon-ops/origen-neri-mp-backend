// index.js (backend completo)
import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

// ---------- Config ----------
const PORT = process.env.PORT || 10000;
const ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441";

mercadopago.configure({ access_token: ACCESS_TOKEN });

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Helpers ----------
const toARSItem = (it) => ({
  title: String(it.title || "Item"),
  quantity: Number(it.quantity || 1),
  unit_price: Math.max(1, Number(it.unit_price || 1)),
  currency_id: "ARS",
});

const cleanEmail = (e) => String(e || "").trim().toLowerCase();
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const phoneAsNumber = (s) => {
  const digits = onlyDigits(s);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

// ---------- Rutas ----------
app.get("/", (_req, res) => {
  res.send("Backend Origen Neri MP funcionando ✅");
});

app.post("/api/checkout", async (req, res) => {
  try {
    const body = req.body || {};
    const itemsIn = Array.isArray(body.items) ? body.items : [];
    const payerIn = body.payer || body.buyer || {};

    const items = itemsIn.length
      ? itemsIn.map(toARSItem)
      : [
          { title: "Compra Origen Neri", quantity: 1, currency_id: "ARS", unit_price: 1 },
        ];

    const email = cleanEmail(payerIn.email);
    const phoneNumber = phoneAsNumber(payerIn.phone?.number ?? payerIn.phone);

    // Validación simple de email
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: "Email inválido. Formato usuario@dominio.com" });
    }

    const payer = {
      name: String(payerIn.name || "").trim(),
      email,
      identification: payerIn.identification
        ? {
            type: String(payerIn.identification.type || "DNI"),
            number: onlyDigits(payerIn.identification.number),
          }
        : undefined,
      ...(phoneNumber ? { phone: { number: phoneNumber } } : {}),
      address: payerIn.address
        ? {
            street_name: String(payerIn.address.street_name || ""),
            zip_code: String(payerIn.address.zip_code || ""),
          }
        : undefined,
    };

    // 🔑 ACÁ está la CLAVE: deep links a TU APP
    const preference = {
      items,
      payer,
      metadata: body.metadata || {},
      back_urls: {
        success: "origenneri://mp-return?status=approved",
        failure: "origenneri://mp-return?status=failure",
        pending: "origenneri://mp-return?status=pending",
      },
      auto_return: "approved",
    };

    const result = await mercadopago.preferences.create(preference);
    return res.json({ init_point: result.body.init_point });
  } catch (err) {
    console.error("Error en /api/checkout:", err);
    const msg =
      err?.message ||
      (typeof err === "string" ? err : "") ||
      "Error al crear la preferencia";
    res.status(500).json({ error: msg });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});