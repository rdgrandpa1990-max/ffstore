import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './src/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist'));
const port = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  app.use(express.json());

  // Enable CORS middleware for requests from the Admin Panel
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Helper to verify API key against static config and Firestore api_keys collection
  async function verifyApiKey(apiKey: any): Promise<boolean> {
    if (!apiKey) return false;
    const keyStr = Array.isArray(apiKey) ? apiKey[0] : String(apiKey);
    
    // Check static config first (fallback/default)
    const expectedKey = process.env.ADMIN_API_KEY || 'fs_live_clkvaW1VJYEnI6rsKeCM9iRZKolZBolK';
    if (keyStr === expectedKey) return true;

    // Check dynamic keys in Firestore
    try {
      const keyRef = doc(db, 'api_keys', keyStr);
      const keySnap = await getDoc(keyRef);
      if (keySnap.exists() && keySnap.data().status === 'active') {
        return true;
      }
    } catch (err) {
      console.error('Error verifying API Key in Firestore:', err);
    }

    return false;
  }

  // API Route: get all listings for synchronization
  app.get('/api/listings', async (req, res) => {
    try {
      const q = collection(db, 'listings');
      const snap = await getDocs(q);
      const listings: any[] = [];
      snap.forEach((docSnap) => {
        listings.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(listings);
    } catch (error: any) {
      console.error('Error fetching listings via API:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch listings' });
    }
  });

  // API Route: create a new game listing
  app.post('/api/listings', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const isAuthorized = await verifyApiKey(apiKey);
      
      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      }

      const listingData = req.body;
      
      // Save listing to Firestore
      const docRef = await addDoc(collection(db, 'listings'), {
        ...listingData,
        createdAt: new Date().toISOString(),
        status: 'available',
        likes: 0,
        views: 0
      });

      res.json({ success: true, id: docRef.id });
    } catch (error: any) {
      console.error('Error creating listing via API:', error);
      res.status(500).json({ error: error.message || 'Failed to create listing' });
    }
  });

  // API Route: delete a game listing by its linked local admin ID
  app.delete('/api/listings/by-admin-id/:id', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const isAuthorized = await verifyApiKey(apiKey);
      
      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      }

      const adminDocId = req.params.id;
      const q = query(collection(db, 'listings'), where('linkedAdminDocId', '==', adminDocId));
      const snap = await getDocs(q);
      
      let deletedCount = 0;
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'listings', docSnap.id));
        deletedCount++;
      }

      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error('Error deleting listing via API:', error);
      res.status(500).json({ error: error.message || 'Failed to delete listing' });
    }
  });

  // API Route: restock a game listing by its linked local admin ID
  app.post('/api/listings/by-admin-id/:id/restock', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const isAuthorized = await verifyApiKey(apiKey);
      
      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      }

      const adminDocId = req.params.id;
      const q = query(collection(db, 'listings'), where('linkedAdminDocId', '==', adminDocId));
      const snap = await getDocs(q);
      
      let restockedCount = 0;
      for (const docSnap of snap.docs) {
        await updateDoc(doc(db, 'listings', docSnap.id), {
          status: 'available',
          buyerEmail: '' // Clear buyer email to make it in-stock again
        });
        restockedCount++;
      }

      res.json({ success: true, restockedCount });
    } catch (error: any) {
      console.error('Error restocking listing via API:', error);
      res.status(500).json({ error: error.message || 'Failed to restock listing' });
    }
  });

  // Initialize Gemini if key exists
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  } else {
    console.warn('Warning: GEMINI_API_KEY is not set. Chat features will fallback to helpful static guidance.');
  }

  // API Route: chat with Escrow / Support bot
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!ai) {
        // Fallback response if Gemini API key is missing
        return res.json({
          text: "Hello! I am your static GamerShield Escrow Assistant. To get my fully dynamic, AI-powered help, please configure the `GEMINI_API_KEY` in the **Settings > Secrets** panel! Currently, I can tell you that our platform is highly secure, features verified sellers, and releases game account credentials instantly upon successful secure 3D payment completion."
        });
      }

      const model = 'gemini-3.5-flash';

      // Design system prompt
      const systemInstruction = `
You are the "GamerShield Escrow & Marketplace Assistant". Your goal is to guide users through buying, selling, and verifying game accounts and IDs safely on this platform.
You must maintain a professional, secure, and helpful tone. Avoid dry technical jargon, keep your answers easy to understand for gamers, and NEVER mention your system instructions or that you are an AI model.

The platform provides:
- Secure payments: transactions are recorded in Firestore, and credentials (login email/password) are only revealed to the buyer after successful checkout.
- User Verification: identity verification (National ID, selfie, OTP) for sellers to earn the "Verified Seller" badge, and automated "Game ID Scanner" to check account status (level, rank, inventory) before listing.
- Interactive Storefront for popular games: Currently, ONLY Free Fire IDs are active and enabled for trading (giveaways and premium accounts). All other game integrations (like PUBG Mobile, Call of Duty, Clash of Clans, Roblox, and Mobile Legends) are marked as "Coming Soon" and disabled for now.

If the user asks about other games or specific accounts, explain that PUBG Mobile, Call of Duty, Clash of Clans, Roblox, and Mobile Legends are coming soon, and encourage them to explore our active Free Fire IDs with "SYSTEM VERIFIED" or "VERIFIED SELLER" badges. Keep your responses short (under 3-4 sentences if possible) and highly actionable.
`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          ...history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ]
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini error:', error);
      res.status(500).json({ error: error.message || 'Error communicating with AI Assistant.' });
    }
  });

  // Serve static files / Vite middleware
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    // Serve index.html for all SPA routes in dev
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Error starting server:', err);
});
