// mail.js
require('dotenv').config({ path: '.env' });

const http = require('http');
const nodemailer = require('nodemailer');

// Exemple de configuration SMTP
let transporter = nodemailer.createTransport({
  host: "smtp.ionos.fr",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendTestMail() {
  let info = await transporter.sendMail({
    from: '"L.A Création" <no-reply@la-creation-boutique.fr>',
    to: "p.martignoles@gmail.com",
    subject: "Test Nodemailer",
    text: "Ça marche !"
  });
  console.log("Mail envoyé :", info.messageId);
}

const server = http.createServer((req, res) => {
  if (req.url === '/send') {
    sendTestMail().catch(console.error);
    res.end('Envoi lancé !');
  } else {
    res.end('Visitez /send pour tester Nodemailer.');
  }
});

server.listen(3002, () => console.log('Écoute sur port 3002'));
