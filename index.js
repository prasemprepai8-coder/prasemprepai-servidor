require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get('/', (req, res) => {
  res.send('Servidor Pra Sempre Pai rodando!');
});

app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log('Notificação recebida:', JSON.stringify(req.body));

    if (type !== 'payment') return res.sendStatus(200);

    const paymentId = data && data.id;

    if (!paymentId || Number(paymentId) < 0) {
      console.log('Notificação de teste recebida, ignorando.');
      return res.sendStatus(200);
    }

    let pagamento;
    try {
      pagamento = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
    } catch (err) {
      console.log(`Pagamento ${paymentId} não encontrado — pode ser teste.`);
      return res.sendStatus(200);
    }

    const { status, payer } = pagamento.data;
    console.log(`Pagamento ${paymentId} — status: ${status}`);

    if (status !== 'approved') return res.sendStatus(200);

    const emailCliente = payer.email;

    await transporter.sendMail({
      from: `"Pra Sempre Pai" <${process.env.EMAIL_USER}>`,
      to: emailCliente,
      subject: '🎁 Pagamento confirmado! Agora crie a página do seu pai',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;color:#1A1612;">
          <h2 style="font-size:22px;margin-bottom:1rem;">Pagamento confirmado! 🎉</h2>
          <p style="color:#6B6560;line-height:1.7;margin-bottom:1.5rem;">
            Recebemos o seu pagamento com sucesso. Agora é hora de criar a página especial para o seu pai.
          </p>
          <a href="https://tally.so/r/Xxg5Eg"
            style="display:inline-block;background:#1A1612;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-size:15px;font-weight:500;margin-bottom:1.5rem;">
            Criar a página do meu pai →
          </a>
          <p
