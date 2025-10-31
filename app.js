import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Lista de números permitidos (development/testing)
const allowedNumbers = ["15551234567", "16315551181"]; // Coloque os números que podem receber mensagens

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
        const changes = entry.changes;
        for (const change of changes) {
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

              // Exemplo de resposta automática
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
                    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
                  }
                );
                console.log("Mensagem enviada com sucesso:", response.data);
              } catch (err) {
                console.error("Erro no POST webhook:", err.response?.data || err.message);
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
