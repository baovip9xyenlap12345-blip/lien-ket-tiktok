require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PANCAKE_API_KEY = process.env.PANCAKE_API_KEY;
const PANCAKE_BASE_URL = process.env.PANCAKE_BASE_URL || 'https://pos.pancake.vn/api/v1';

if (!PANCAKE_API_KEY) {
  console.warn('[pancake] PANCAKE_API_KEY is not set. Create a .env file from .env.example.');
}

app.use(express.static(path.join(__dirname)));
app.use(express.json());

async function pancakeRequest(pathname, params = {}) {
  const url = new URL(PANCAKE_BASE_URL + pathname);
  url.searchParams.set('api_key', PANCAKE_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(`Pancake API error (${response.status})`);
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

// List shops connected to this Pancake account
app.get('/api/pancake/shops', async (req, res) => {
  try {
    const data = await pancakeRequest('/shops');
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.body });
  }
});

// List orders for a given shop
app.get('/api/pancake/shops/:shopId/orders', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page_size, page_number } = req.query;
    const data = await pancakeRequest(`/shops/${shopId}/orders`, {
      page_size: page_size || 20,
      page_number: page_number || 1,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.body });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
