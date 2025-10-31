import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN; // seu .env usa WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Pega os números permitidos do .env e transforma em array
const allowedNumbers = process.env.ALLOWED_NUMBERS?.split(",") || [];

app.use(express.json());

// Verificação do webhook
app.get("/", (req, res) => {
  const { "hub.mode": mode, "hub.challenge": challenge, "hub.verify_token": token } = req.query;
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Recebendo mensagens do WhatsApp
app.post("/", async (req, res) => {
  try {
    const body = req.body;
    console.log("Webhook received", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;

          // Mensagens recebidas
          if (value.messages) {
            for (const msg of value.messages) {
              const from = msg.from;
              const text = msg.text?.body;
              console.log(`Mensagem de ${from}: ${text}`);

              // Responder apenas se o número estiver na lista
              if (!allowedNumbers.includes(from)) {
                console.log(`Número ${from} não permitido. Ignorando.`);
                continue;
              }

              // Resposta automática
              const responseBody = {
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: `Recebi sua mensagem: "${text}"` }
              };

              try {
                const response = await axios.post(
                  `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
                  responseBody,
                  {
                    headers: {
                      Authorization: `Bearer ${ACCESS_TOKEN}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                console.log("Mensagem enviada com sucesso:", response.data);
              } catch (err) {
                console.error("Erro ao enviar mensagem:", err.response?.data || err.message);
              }
            }
          }

          // Status das mensagens enviadas
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log(`Status da mensagem ${status.id}: ${status.status}`);
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.sendStatus(500);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
