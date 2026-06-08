const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");

let sock = null;
let isWhatsAppReady = false;

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
      browser: Browsers.macOS("Chrome")
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        isWhatsAppReady = true;

        console.log("✅ WhatsApp CONNECTED & READY ✅");
        
      }

      if (connection === "close") {
        isWhatsAppReady = false;

        console.log("⚠️ WhatsApp disconnected. Reconnecting...");

        setTimeout(connectToWhatsApp, 5000);
      }
    });
  } catch (err) {
    console.error("WhatsApp Connection Error:", err);

    setTimeout(connectToWhatsApp, 10000);
  }
}

connectToWhatsApp();

module.exports = {
  getSock: () => sock,
  isReady: () => isWhatsAppReady
};