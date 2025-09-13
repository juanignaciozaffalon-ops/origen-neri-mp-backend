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

/** Devuelve SOLO dígitos (sin +, espacios, guiones) */
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

/** MP (sdk que estás usando) valida `payer.phone.number` como NUMBER */
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

    // Soportá tanto body.items/body.payer como body.items/body.buyer (por si quedó viejo en el front)
    const itemsIn = Array.isArray(body.items) ? body.items : [];
    const payerIn = body.payer || body.buyer || {};

    const items = itemsIn.length
      ? itemsIn.map(toARSItem)
      : [
          {
            title: "Compra Origen Neri",
            quantity: 1,
            currency_id: "ARS",
            unit_price: 1,
          },
        ];

    // --- Armo payer limpio ---
    const email = cleanEmail(payerIn.email);
    const phoneNumber = phoneAsNumber(payerIn.phone?.number ?? payerIn.phone);

    const payer = {
      name: String(payerIn.name || "").trim(),
      email, // MP valida esto
      identification: payerIn.identification
        ? {
            type: String(payerIn.identification.type || "DNI"),
            number: onlyDigits(payerIn.identification.number),
          }
        : undefined,
      // Solo incluyo `phone` si tengo un número válido
      ...(phoneNumber
        ? { phone: { number: phoneNumber } }
        : {}),
      address: payerIn.address
        ? {
            street_name: String(payerIn.address.street_name || ""),
            zip_code: String(payerIn.address.zip_code || ""),
          }
        : undefined,
    };

    // Validación rápida de email del lado del server (si viene mal, devolvemos 400)
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res
        .status(400)
        .json({ error: "Email inválido. Debe tener formato usuario@dominio.com" });
    }

    const preference = {
      items,
      payer,
      metadata: body.metadata || {},
      back_urls: body.back_urls || {
        success: "https://origenneri.com/success",
        failure: "https://origenneri.com/failure",
        pending: "https://origenneri.com/pending",
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