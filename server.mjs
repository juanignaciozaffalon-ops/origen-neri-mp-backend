import express from 'express';
import cors from 'cors';
import mercadopago from 'mercadopago';

// ⚙️ Config
const PORT = process.env.PORT || 10000;
const ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN ||
  'APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441'; // <<< podés usar env var en Render

// Back URLs (podés cambiarlas o setearlas como ENV en Render)
const SUCCESS_URL = process.env.SUCCESS_URL || 'https://origenneri.com/success';
const FAILURE_URL = process.env.FAILURE_URL || 'https://origenneri.com/failure';
const PENDING_URL = process.env.PENDING_URL || 'https://origenneri.com/pending';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || ''; // opcional

// SDK MP
mercadopago.configure({ access_token: ACCESS_TOKEN });

// App
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('OK: Origen Neri MP backend'));

// Crear preferencia y devolver URL de pago
app.post('/api/checkout', async (req, res) => {
  try {
    const { items = [], buyer = {} } = req.body || {};

    // Sanitizar items
    const mpItems = items.map((it) => ({
      title: String(it.title || 'Producto'),
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || 0),
      currency_id: 'ARS'
    }));

    const preference = {
      items: mpItems,
      payer: {
        name: buyer.name || '',
        email: buyer.email || ''
      },
      back_urls: {
        success: SUCCESS_URL,
        failure: FAILURE_URL,
        pending: PENDING_URL
      },
      auto_return: 'approved',
      ...(NOTIFICATION_URL ? { notification_url: NOTIFICATION_URL } : {})
    };

    const result = await mercadopago.preferences.create(preference);

    // Para apps/web: usá init_point (checkout web). En mobile también funciona.
    return res.json({ url: result.body.init_point });
  } catch (err) {
    console.error('MP error', err);
    return res.status(500).json({ error: 'Error creando preferencia' });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`✅ MP backend escuchando en puerto ${PORT}`);
});
