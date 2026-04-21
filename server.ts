import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: admin.firestore.Firestore;

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Starting server initialization...");
  app.use(express.json());

  // CORS — permite chamadas do frontend (Cloudflare Pages)
  app.use((req, res, next) => {
    const origin = process.env.ALLOWED_ORIGIN || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // LISTEN EARLY so the platform detects the server as started
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SERVER INITIALIZING AND LISTENING ON http://0.0.0.0:${PORT}`);
  });

  // Basic health check that works even if everything else fails
  app.get("/api/health", (req, res) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  try {
    const configPath = path.join(__dirname, "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at ${configPath}`);
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("Loaded firebase config for project:", firebaseConfig.projectId);

    // HARD RESET: Ensure we are using a fresh app for the target project
    // This solves issues where the environment might have a stale default app
    for (const extantApp of admin.apps) {
      if (extantApp) {
        console.log(`[FIREBASE] Cleaning up existing app: ${extantApp.name}`);
        await extantApp.delete();
      }
    }

    console.log("[FIREBASE] Initializing fresh Admin SDK for project:", firebaseConfig.projectId);
    const firebaseAdminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    
    // Explicitly select the database
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    console.log("[FIREBASE] Target Database ID:", dbId);

    // Pass the app instance EXPLICITLY to getFirestore to ensure Admin rights are used
    if (dbId === "(default)") {
      db = getFirestore(firebaseAdminApp);
    } else {
      console.log(`[FIREBASE] Targeting named database [${dbId}] with fresh Admin context`);
      db = getFirestore(firebaseAdminApp, dbId);
    }
    
    // Configure settings
    db.settings({ ignoreUndefinedProperties: true });
    
    // Diagnostic Ping (Optional/Non-blocking)
    try {
      console.log("[FIREBASE] Initialized as Admin for [${dbId}]. Skipping write ping due to potential IAM restrictions.");
      // We skip the set() ping here because the identity might not have write access,
      // and we handle mission-critical writes on the client-side.
    } catch (e: any) {
      console.warn(`[FIREBASE] Initialization info:`, e.message);
    }
    
    console.log("Checking for AbacatePay configuration...");
    const ABACATE_KEY = process.env.ABACATEPAY_API_KEY;
    if (ABACATE_KEY && ABACATE_KEY.trim().length > 0) {
      console.log("ABACATEPAY_API_KEY found. Using direct axios calls.");
    } else {
      console.warn("CRITICAL: ABACATEPAY_API_KEY is missing or empty!");
    }
  } catch (err: any) {
    console.error("FAILED to initialize core services:", err.message);
  }

  // --- API Routes ---
  app.post("/api/billing/create", async (req, res) => {
    let currentStep = "starting";
    try {
      const { amount, userId, email } = req.body;
      const numericAmount = Number(amount);

      if (!userId) return res.status(400).json({ error: "userId missing" });
      
      currentStep = "checking_db";
      if (!db) {
        throw new Error("Servidor não inicializou o banco de dados.");
      }
      
      currentStep = "checking_sdk";
      const abacate = app.get("abacate");
      const ABACATE_KEY = process.env.ABACATEPAY_API_KEY;

      if (!abacate && !ABACATE_KEY) {
        throw new Error("Chave API do AbacatePay (ABACATEPAY_API_KEY) não encontrada nos Secrets.");
      }

      if (isNaN(numericAmount) || numericAmount < 1) {
        return res.status(400).json({ error: "O valor mínimo para depósito é R$ 1,00" });
      }

      currentStep = "preparing_payload";
      const priceCents = Math.round(numericAmount * 100);

      const payload = {
        frequency: "ONE_TIME",
        methods: ["PIX"],
        amount: priceCents,
        customer: {
          name: "Cliente PixVest",
          email: String(email || "cliente@pixvest.com"),
          taxId: "92015743200", 
          cellphone: "69993242628",
        },
        metadata: {
          userId: userId
        }
      };

      console.log(`[DEPOSIT] Calling AbacatePay V2 Billings (Plural) Endpoint... Amount: ${priceCents} cents`);
      
      currentStep = "calling_v2_billings";
      
      let response;
      try {
        const axiosRes = await axios.post("https://api.abacatepay.com/v2/billings", payload, {
          headers: {
            Authorization: `Bearer ${ABACATE_KEY?.trim()}`,
            "Content-Type": "application/json"
          }
        });
        response = axiosRes.data;
      } catch (apiErr: any) {
        const errorData = apiErr.response?.data || apiErr.message;
        console.error("[DEPOSIT] Billings API V2 failed:", JSON.stringify(errorData, null, 2));
        
        return res.status(400).json({ 
          error: errorData.error || errorData.message || "Erro na criação da cobrança", 
          step: currentStep,
          details: errorData
        });
      }

      currentStep = "processing_response";
      const billingData = response?.data || response;
      
      console.log(`[DEPOSIT] Success! Checkout ID: ${billingData?.id}`);
      res.json({ 
        url: billingData.url,
        id: billingData.id
      });

    } catch (error: any) {
      console.error(`[DEPOSIT] Fatal error at step [${currentStep}]:`, error.message);
      res.status(500).json({ 
        error: "Erro inesperado ao gerar depósito", 
        step: currentStep,
        details: error.message 
      });
    }
  });

  // 3. Request withdrawal (Saque)
  app.post("/api/withdraw/request", async (req, res) => {
    try {
      const { amount, userId, pixKey } = req.body;
      const value = parseFloat(amount);

      if (isNaN(value) || value <= 0) {
        return res.status(400).json({ error: "Valor de saque inválido" });
      }

      const userRef = db.collection("users").doc(userId);

      // Secure transaction to check balance and update
      const result = await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw new Error("Usuário não encontrado");

        const currentBalance = userDoc.data()?.balance || 0;
        if (currentBalance < value) {
          throw new Error("Saldo insuficiente");
        }

        // Deduct balance
        t.update(userRef, { balance: currentBalance - value });

        // Add transaction record
        const txRef = userRef.collection("transactions").doc();
        t.set(txRef, {
          userId,
          type: "withdrawal",
          amount: value,
          pixKey,
          status: "completed", // In a real production app, this might be "processing" until actual Pix transfer
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          provider: "system"
        });

        return { newBalance: currentBalance - value };
      });

      res.json({ success: true, balance: result.newBalance });
    } catch (error: any) {
      console.error("Withdrawal error:", error.message);
      res.status(500).json({ error: error.message || "Falha ao processar saque" });
    }
  });

  // 2. Webhook to handle payment confirmation (AbacatePay V2)
  app.post("/api/webhook/abacatepay", async (req, res) => {
    try {
      const payload = req.body;
      const data = payload.data;

      // Log the event for debugging
      console.log(`[WEBHOOK] Received event: ${payload.event} for object id: ${data?.id}`);

      // V2 events: checkout.completed is standard, billing.paid might be sent depending on setup
      if (payload.event === "checkout.completed" || payload.event === "billing.paid") {
        const id = data.id;
        const customerId = data.metadata?.userId; 
        const amountCents = data.amount;
        const amount = amountCents / 100;

        if (!customerId) {
          console.error("[WEBHOOK] No userId found in metadata. Object Data:", JSON.stringify(data));
          return res.status(200).send("No userId found");
        }

        const userRef = db.collection("users").doc(customerId);
        
        // Find the pending transaction
        // First try exact billingId, then fallback to amount + status
        let txDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null = null;
        
        const txById = await userRef.collection("transactions").where("billingId", "==", id).limit(1).get();
        if (!txById.empty) {
          txDoc = txById.docs[0];
        } else {
          const txByAmount = await userRef
            .collection("transactions")
            .where("status", "==", "pending")
            .where("amount", "==", amount)
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();
          if (!txByAmount.empty) txDoc = txByAmount.docs[0];
        }

        if (txDoc) {
          await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) return;

            const currentBalance = userDoc.data()?.balance || 0;
            
            t.update(userRef, { balance: currentBalance + amount });
            t.update(txDoc!.ref, { 
              status: "completed", 
              abacateId: id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp() 
            });
          });

          console.log(`[WEBHOOK] Successfully processed deposit for user ${customerId}: R$ ${amount}`);
        } else {
          console.warn(`[WEBHOOK] No matching pending transaction found for user ${customerId}`);
        }
      }

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("[WEBHOOK] Processing error:", error.message);
      res.status(500).send("Internal Server Error");
    }
  });

  // --- API-only mode for Railway (frontend served by Cloudflare Pages) ---
  // The frontend is deployed separately, so we skip Vite/static serving.
  console.log("Backend-only mode: skipping Vite/static file serving.");
}

// Global catch-all for the whole server process
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error(">>> FATAL: startServer failed to start:", err);
});
