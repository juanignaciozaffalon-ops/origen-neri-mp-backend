import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Ajustá CORS a tus orígenes reales (dominio web o scheme de Expo web).
app.use(cors({
  origin: [
    'http://localhost:8081', // expo web local (ajustá tu puerto si difiere)
    'http://localhost:19006',
    'https://*'              // mientras probás; luego restringí a tu dominio
  ]
}));

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_API = 'https://api.mercadopago.com';

app.get('/', (_, res) => res.send('OK - Origen Neri MP backend'));

// Crear preferencia
app.post('/api/mp/checkout', async (req, res) => {
  try {
    const { items = [], back_urls } = req.body;

    // ⚠️ Recomendado: recalcular precios/total del lado servidor para evitar manipulación
    const mpItems = items.map((it) => ({
      title: String(it.title),
      quantity: Number(it.quantity || 1),
      currency_id: process.env.MP_CURRENCY_ID || 'ARS', // ARS o USD
      unit_price: Number(it.unit_price),
      picture_url: it.picture_url || undefined,
    }));

    const body = {
      items: mpItems,
      back_urls,                     // { success, failure, pending } — tus deep links
      auto_return: 'approved',
      statement_descriptor: 'ORIGEN NERI',
      notification_url: process.env.NOTIFICATION_URL || undefined, // webhook (opcional)
    };

    const r = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();

    if (!r.ok) {
      console.error('MP error:', data);
      return res.status(400).send(data);
    }

    // init_point (prod) o sandbox_init_point (modo test)
    return res.json({
      id: data.id,
      init_point: data.init_point || data.sandbox_init_point
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: 'internal_error' });
  }
});

// (Opcional) Webhook de notificaciones para confirmar pagos y disparar emails
app.post('/api/mp/webhook', (req, res) => {
  // Verificá req.body, topic/type y consultá /v1/payments/:id
  // Luego enviá emails (cliente y ustedes) con Nodemailer/Sendgrid, etc.
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MP backend listening on :${PORT}`));
