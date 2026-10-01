import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Allow large image uploads for receipt OCR
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static assets from public/
app.use(express.static(path.resolve(__dirname, 'public')));

// OCR endpoint for receipt extraction
app.post('/api/ocr-receipt', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided in request body.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check environment configuration.',
      });
    }

    // Strip header prefix if data URL (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
    const cleanMimeType = image.includes(',')
      ? image.split(';')[0].replace('data:', '')
      : mimeType;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `You are an expert fuel receipt OCR parser. Analyze this fuel receipt image carefully and extract all relevant information for a commercial driver's Fuel Purchase Log.

Look for:
1. date: Transaction date formatted as YYYY-MM-DD (e.g., 2026-09-04). If the year is ambiguous, assume 2026.
2. state: Two-letter US State abbreviation where the fuel station is located (e.g. IL, IN, WI, etc.). Look at station address or state header.
3. gallons: Exact volume of fuel pumped in gallons as a decimal number (e.g., 59.812, 40.996). Do NOT round.
4. fuelType: Single character. "D" for Diesel / Ultra Low Sulfur Diesel / DEF, "G" for Gasoline / Unleaded / Regular / Premium.
5. purchasedFrom: Fuel station vendor brand name and city/location in uppercase (e.g. "QUICK TRIP ADDISON", "SHELL GILBERTS", "THORNTONS N. AURORA", "LOVES TRAVEL STOP").
6. invoiceNumber: Invoice #, Receipt #, Trans #, Sequence #, or Ticket # if present on receipt. If not clearly present, leave as empty string.
7. amount: Total dollar amount paid as a positive number (e.g., 354.01). Do not include dollar sign.
8. pricePerGallon: Unit price per gallon if printed (e.g., 5.919).
9. notes: Any extra station or pump notes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: 'Transaction date in YYYY-MM-DD format',
            },
            state: {
              type: Type.STRING,
              description: 'Two-letter US state postal abbreviation, e.g. IL',
            },
            gallons: {
              type: Type.NUMBER,
              description: 'Total fuel volume pumped in gallons',
            },
            fuelType: {
              type: Type.STRING,
              description: 'Fuel type code: "D" for Diesel or "G" for Gasoline',
            },
            purchasedFrom: {
              type: Type.STRING,
              description: 'Station name and city/location in uppercase',
            },
            invoiceNumber: {
              type: Type.STRING,
              description: 'Invoice, receipt, or transaction number',
            },
            amount: {
              type: Type.NUMBER,
              description: 'Total amount paid in dollars',
            },
            pricePerGallon: {
              type: Type.NUMBER,
              description: 'Calculated or printed price per gallon',
            },
            notes: {
              type: Type.STRING,
              description: 'Optional additional transaction details or pump number',
            },
          },
          required: ['date', 'gallons', 'amount'],
        },
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown OCR error';
    console.error('OCR processing error:', errorMsg);
    return res.status(500).json({
      success: false,
      error: 'Receipt OCR scan failed: ' + errorMsg,
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fuel-log-tracker' });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fuel Log server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
