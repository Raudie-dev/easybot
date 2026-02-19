// Microservicio gateway WhatsApp -> Django
// - Conexión usando @whiskeysockets/baileys (Multi-Device)
// - Persiste credenciales en ./auth_info para evitar re-scan del QR
// - Muestra QR en terminal y expone endpoint GET /qr para que Django lo pida
// - Reenvía mensajes entrantes al webhook de Django
// - Expone endpoint POST /send para enviar mensajes desde Django

import express from 'express';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';

const PORT = process.env.PORT || 3000;
const DJANGO_WEBHOOK = process.env.DJANGO_WEBHOOK || 'http://127.0.0.1:8000/api/whatsapp/webhook/';

let latestQr = null; // guarda el string del QR para el endpoint
let sock = null; // referencia al socket de baileys

// Extrae texto del mensaje en los distintos tipos soportados
function extractMessageText(message) {
  if (!message) return '';
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage && message.extendedTextMessage.text) return message.extendedTextMessage.text;
  if (message.imageMessage && message.imageMessage.caption) return message.imageMessage.caption;
  if (message.videoMessage && message.videoMessage.caption) return message.videoMessage.caption;
  if (message.buttonsResponseMessage && message.buttonsResponseMessage.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
  if (message.templateButtonReplyMessage && message.templateButtonReplyMessage.selectedId) return message.templateButtonReplyMessage.selectedId;
  // fallback: stringify (útil para tipos nuevos o debugging)
  try { return JSON.stringify(message); } catch (e) { return '' }
}

// Inicia el socket de Baileys con persistencia en ./auth_info
async function startSocket() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({ auth: state, version });

    // Guarda credenciales cuando se actualizan
    sock.ev.on('creds.update', saveCreds);

    // Manejo de eventos de conexión y QR
    sock.ev.on('connection.update', (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        // se genera QR en terminal y se guarda en la variable
        latestQr = qr;
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        latestQr = null; // autenticado, no hay QR activo
        console.log('Conexión abierta con WhatsApp');
      }

      if (connection === 'close') {
        console.error('Conexión cerrada, intentando reconectar...', lastDisconnect?.error || 'sin error');
        // Intentamos reiniciar el socket después de un pequeño delay
        setTimeout(() => startSocket().catch(err => console.error('Error reconectando:', err)), 2000);
      }
    });

    // Escucha mensajes entrantes, los reenvía al webhook de Django y responde al usuario
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const upsertType = m.type; // 'notify' normalmente
        const messages = m.messages || [];
        for (const msg of messages) {
          // Ignorar mensajes propios o mensajes sin contenido
          if (!msg.message || msg.key?.fromMe) continue;

          const remoteJid = msg.key.remoteJid || '';
          const pushName = msg.pushName || msg.contact?.name || '';
          const messageText = extractMessageText(msg.message);

          // Enviar al webhook de Django y reenviar la respuesta al usuario
          try {
            const resp = await axios.post(
              DJANGO_WEBHOOK,
              { remoteJid, pushName, messageText },
              { headers: { 'Content-Type': 'application/json' } }
            );
            if (resp && resp.data && resp.data.reply) {
              await sock.sendMessage(remoteJid, { text: resp.data.reply });
            } else {
              console.warn('Respuesta inesperada del webhook:', resp && resp.data);
            }
          } catch (err) {
            console.error('Error enviando webhook a Django o reenviando mensaje:', err.message || err);
          }
        }
      } catch (err) {
        console.error('Error procesando messages.upsert:', err);
      }
    });

    console.log('Socket inicializado');
    return sock;
  } catch (err) {
    console.error('Error iniciando socket:', err);
    throw err;
  }
}

// Servidor HTTP minimal con Express
function startServer() {
  const app = express();
  app.use(express.json());

  // Endpoint para que Django pida el QR (string)
  app.get('/qr', (req, res) => {
    if (!latestQr) return res.json({ qr: null, message: 'No QR activo. Probablemente ya autenticado.' });
    return res.json({ qr: latestQr });
  });

  // Endpoint para enviar mensajes desde Django: { number, message }
  app.post('/send', async (req, res) => {
    const { number, message } = req.body || {};
    if (!number || !message) return res.status(400).json({ error: 'Faltan campos: number y message' });
    if (!sock) return res.status(503).json({ error: 'Socket no inicializado' });

    try {
      // Normalizar JID: si no trae @, asumimos usuario individual
      const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });
      return res.json({ ok: true });
    } catch (err) {
      console.error('Error enviando mensaje:', err?.message || err);
      return res.status(500).json({ error: 'Error enviando mensaje', details: err?.message || String(err) });
    }
  });

  app.listen(PORT, () => console.log(`WhatsApp gateway escuchando en http://localhost:${PORT}`));
}

// Arranque principal
(async () => {
  try {
    await startSocket();
    startServer();
  } catch (err) {
    console.error('Fallo en el arranque del servicio:', err);
    process.exit(1);
  }
})();
