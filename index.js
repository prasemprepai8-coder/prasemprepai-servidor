const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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

app.get('/debug', (req, res) => {
  res.json({
    token_existe: !!process.env.MP_ACCESS_TOKEN,
    token_inicio: process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.slice(0, 10) : 'vazio',
    email: process.env.EMAIL_USER || 'vazio'
  });
});

app.post('/criar-pagamento', async (req, res) => {
  try {
    const { emailCliente } = req.body;
    console.log('Criando pagamento para:', emailCliente);
    console.log('Token existe:', !!process.env.MP_ACCESS_TOKEN);

    const preferencia = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [{
          title: 'Pagina Personalizada - Pra Sempre Pai',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 19.90,
        }],
        payer: { email: emailCliente },
        back_urls: {
          success: 'https://dia-dos-pais-html-atualizado.vercel.app/?status=aprovado',
          failure: 'https://dia-dos-pais-html-atualizado.vercel.app/?status=falhou',
          pending: 'https://dia-dos-pais-html-atualizado.vercel.app/?status=pendente',
        },
        auto_return: 'approved',
        notification_url: 'https://prasemprepai-servidor-production.up.railway.app/webhook',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Pagamento criado:', preferencia.data.id);
    res.json({ link: preferencia.data.init_point });
  } catch (error) {
    console.error('Erro ao criar pagamento:', error.message);
    if (error.response) {
      console.error('Detalhe MP:', JSON.stringify(error.response.data));
      console.error('Status MP:', error.response.status);
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log('Notificacao recebida:', JSON.stringify(req.body));

    if (type !== 'payment') return res.sendStatus(200);

    const paymentId = data && data.id;
    if (!paymentId || Number(paymentId) < 0) return res.sendStatus(200);

    let pagamento;
    try {
      pagamento = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
    } catch (err) {
      console.log(`Pagamento ${paymentId} nao encontrado.`);
      return res.sendStatus(200);
    }

    const { status, payer } = pagamento.data;
    if (status !== 'approved') return res.sendStatus(200);

    await transporter.sendMail({
      from: `"Pra Sempre Pai" <${process.env.EMAIL_USER}>`,
      to: payer.email,
      subject: 'Pagamento confirmado! Crie a pagina do seu pai',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;color:#1A1612;">
          <h2>Pagamento confirmado!</h2>
          <p style="color:#6B6560;">Clique abaixo para criar a pagina do seu pai:</p>
          <a href="https://tally.so/r/Xxg5Eg"
            style="display:inline-block;background:#1A1612;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-size:15px;font-weight:500;">
            Criar a pagina do meu pai
          </a>
        </div>
      `,
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error.message);
    res.sendStatus(500);
  }
});

app.post('/gerar-pagina', async (req, res) => {
  try {
    const { emailCliente } = req.body;
    const paginaId = Math.random().toString(36).slice(2, 8);
    const linkPagina = `https://dia-dos-pais-html-atualizado.vercel.app/p/${paginaId}`;

    await transporter.sendMail({
      from: `"Pra Sempre Pai" <${process.env.EMAIL_USER}>`,
      to: emailCliente,
      subject: 'A pagina do seu pai esta pronta!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;color:#1A1612;">
          <h2>A pagina esta pronta!</h2>
          <div style="background:#FDF6E7;border-radius:10px;padding:1rem;margin:1rem 0;
            font-family:monospace;color:#C8973A;word-break:break-all;">
            ${linkPagina}
          </div>
          <a href="${linkPagina}"
            style="display:inline-block;background:#1A1612;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-size:15px;font-weight:500;">
            Ver a pagina do meu pai
          </a>
        </div>
      `,
    });

    res.json({ success: true, link: linkPagina });
  } catch (error) {
    console.error('Erro ao gerar pagina:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
