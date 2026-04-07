import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // --- API ROUTES ---

  // 1. KiotViet: Get Token & Fetch Products
  app.post('/api/kiotviet/products', async (req, res) => {
    const { retailer, clientId, clientSecret } = req.body;

    if (!retailer || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing KiotViet credentials' });
    }

    try {
      // Step 1: Get Access Token
      const tokenResponse = await axios.post(
        'https://id.kiotviet.vn/connect/token',
        new URLSearchParams({
          scopes: 'PublicApi.Access',
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Fetch Products
      const productsResponse = await axios.get('https://public.api.kiotviet.vn/products?pageSize=20', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Retailer: retailer,
        },
      });

      res.json({ products: productsResponse.data.data });
    } catch (error: any) {
      console.error('KiotViet API Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch KiotViet products', details: error.response?.data });
    }
  });

  // 2. Gemini: Generate Facebook Post
  app.post('/api/gemini/generate', async (req, res) => {
    const { product } = req.body;

    if (!product) {
      return res.status(400).json({ error: 'Missing product data' });
    }

    try {
      const prompt = `
        You are an expert social media marketer. Write an engaging Facebook post to sell the following product.
        Make it catchy, highlight the value, and include relevant emojis.
        Keep it under 150 words.
        
        Product Name: ${product.fullName || product.name}
        Price: ${product.basePrice} VND
        Category: ${product.categoryName || 'General'}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ content: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // 3. Facebook: Post to Page
  app.post('/api/facebook/post', async (req, res) => {
    const { pageId, accessToken, message } = req.body;

    if (!pageId || !accessToken || !message) {
      return res.status(400).json({ error: 'Missing Facebook credentials or message' });
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        {
          message: message,
          access_token: accessToken,
        }
      );

      res.json({ success: true, id: response.data.id });
    } catch (error: any) {
      console.error('Facebook API Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to post to Facebook', details: error.response?.data });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
