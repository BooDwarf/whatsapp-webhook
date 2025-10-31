// app.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;      // ex: vibecode (defina no Render)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;  // seu access token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // phone_number_id (ex: 850710884792526)

app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/', async (req, res) => {
  try {
    console.log('Webhook received', JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Mensagens recebidas
    const message = value?.messages?.[0];
    if (message && message.type === 'text') {
      const from = message.from;
      const text = message.text?.body || '';

      console.log(`Mensagem de ${from}: ${text}`);

      // lógica simples de resposta
      let reply = "Desculpa, não entendi. Tenta 'hi' ou 'menu'.";
      const t = text.trim().toLowerCase();
      if (t.includes('hi') || t.includes('oi') || t.includes('olá')) {
        reply = "Hey! 👋 Eu sou um bot de teste. Diz 'menu' pra ver opções.";
      } else if (t === 'menu') {
        reply = "1) Ver horário\n2) Falar com humano (simulação)\nResponda com o número.";
      } else if (t === '1') {
        reply = `Agora: ${new Date().toLocaleString()}`;
      } else if (t === '2') {
        reply = "Ok, vou avisar um humano. (simulação)";
      } else {
        reply = `Você disse: "${text}". Diga 'menu' pra opções.`;
      }

      // Envia resposta via API do WhatsApp Cloud
      const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
      const body = {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      };

      await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Reply enviado para ${from}`);
    }

    // Status updates (delivered, failed, etc.)
    const statuses = value?.statuses;
    if (statuses && statuses.length) {
      console.log('Status update:', JSON.stringify(statuses, null, 2));
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no POST webhook:', err.response?.data || err.message || err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
