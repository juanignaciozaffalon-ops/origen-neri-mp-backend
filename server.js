const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configura Mercado Pago con tu access token
mercadopago.configure({
  access_token: 'APP_USR-7887179924901500-090918-0fd37777b5860ddd03023b96f1973d2d-453670441'
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend de Origen Neri con Mercado Pago funcionando 🚀');
});

// Ruta para checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const { items, buyer } = req.body;

    const preference = {
      items: items.map(i => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: 'ARS',
      })),
      payer: {
        name: buyer.name,
        email: buyer.email,
      },
      back_urls: {
        success: "https://origenneri1.odoo.com/success",
        failure: "https://origenneri1.odoo.com/failure",
        pending: "https://origenneri1.odoo.com/pending",
      },
      auto_return: "approved",
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id, init_point: response.body.init_point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
