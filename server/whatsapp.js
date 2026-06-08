const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");

let sock;
let isWhatsAppReady = false;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: true,
    browser: Browsers.macOS("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "open") {
      isWhatsAppReady = true;
      console.log("WhatsApp Ready");
    }

    if (connection === "close") {
      isWhatsAppReady = false;
      setTimeout(connectToWhatsApp, 5000);
    }
  });
}

connectToWhatsApp();

module.exports = {
  sock,
  isWhatsAppReady
};