// server.js
require('dotenv').config();

// 1.Imports
const path       = require('path');  
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const axios      = require('axios');
const crypto     = require('crypto');

// 2) Création de l’app et middlewares globaux
const app = express();
app.use(cors());
app.use(express.json());

// 3) Service des fichiers statiques (HTML, JS, CSS, assets…)
app.use(express.static(path.join(__dirname)));  
//    ↑ comme vous avez vos index.html, dashboard.html, js/, css/, assets/ à la racine

// nodemailer
const transporter = nodemailer.createTransport({
    host:  "smtp.ionos.fr",
    port:  465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
    });

// 4) Routes API

  // POST /login
  app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  // 1) Récupérer l'utilisateur dans Airtable
  const filter = `filterByFormula=AND({Login}='${email}')`;
  const urlGet = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/`
               + `${process.env.AIRTABLE_USER_TABLE}?${filter}`;
  let records;
  try {
    const resp = await axios.get(urlGet, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
    });
    records = resp.data.records;
    if (records.length === 0) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }
  } catch (err) {
    console.error("Airtable login GET error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }

  const user = records[0].fields;
  // 2) Vérifier le mot de passe
  if (user.Password !== password) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  // 3) Répondre les données utiles (sans renvoyer le mot de passe)
  res.json({
    utilisateur: {
      email: user.Login,
      prenom: user.Prenom,  
      role:   user.Role       
    }
  });
  });

  // reset-password
  app.post('/reset-password', async (req, res) => {
  const { login } = req.body;
  if (!login) return res.status(400).json({ error: "login requis" });

  // 1) On cherche l'utilisateur dans Airtable
  const filter = `filterByFormula=AND({Login}='${login}')`;
  const urlGet = `https://api.airtable.com/v0/`
    + `${process.env.AIRTABLE_BASE_ID}/`
    + `${process.env.AIRTABLE_USER_TABLE}?${filter}`;

  let records;
  try {
    const resp = await axios.get(urlGet, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
    });
    records = resp.data.records;
    if (records.length === 0) {
      return res.status(404).json({ error: "utilisateur non trouvé" });
    }
  } catch (err) {
    console.error("Airtable GET error:", err.response?.data || err.message);
    return res.status(500).json({ error: "erreur Airtable lecture" });
  }

  const recordId = records[0].id;

  // 2) Génération du nouveau mot de passe
  const newPassword = Math.random().toString(36).slice(-8);

  // 3) On met à jour le champ Password sur Airtable
  const urlPatch = `https://api.airtable.com/v0/`
    + `${process.env.AIRTABLE_BASE_ID}/`
    + `${process.env.AIRTABLE_USER_TABLE}/${recordId}`;
  try {
    await axios.patch(urlPatch,
      { fields: { Password: newPassword } },
      { headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error("Airtable PATCH error:", err.response?.data || err.message);
    return res.status(500).json({ error: "erreur Airtable écriture" });
  }

  // 4) On envoie l’e-mail avec le mot de passe
  try {
    await transporter.sendMail({
      from: '"L.A Création" <bonjour@la-creation-boutique.fr>',
      to: login,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <p>Bonjour,</p>
        <p>Voici votre nouveau mot de passe : <strong>${newPassword}</strong></p>
         <hr>
        <p><img src="https://showroom.la-creation-boutique.fr/assets/logo.png" alt="Logo L.A Création" style="max-width:200px"></p>
      `
    });
    return res.json({ message: "e-mail envoyé" });
  } catch (err) {
    console.error("SMTP error:", err);
    return res.status(500).json({ error: "échec de l'envoi" });
  }
  });


// Démarrage serveur
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Serveur reset-password lancé sur port ${PORT}`)
);

