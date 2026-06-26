require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
app.use(express.json());

// ─── CONFIGURAÇÃO DE E-MAIL ───
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── ROTA DE TESTE ───
app.get('/', (req, res) => {
  res.send('Servidor Pra Sempre Pai rodando!');
});

// ─── WEBHOOK DO MERCADO PAGO ───
// Essa rota é chamada automaticamente pelo Mercado Pago quando o PIX cai
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    // Só processa notificações de pagamento aprovado
    if (type !== 'payment') return res.sendStatus(200);

    // Busca os detalhes do pagamento na API do Mercado Pago
    const pagamento = await axios.get(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const { status, payer } = pagamento.data;

    // Só envia o e-mail se o pagamento foi aprovado
    if (status !== 'approved') return res.sendStatus(200);

    const emailCliente = payer.email;

    // Envia o link do Tally para o cliente
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
          <p style="color:#6B6560;line-height:1.7;margin-bottom:1.5rem;">
            Clique no botão abaixo para preencher o formulário com as fotos e mensagens:
          </p>
          <a href="https://tally.so/r/Xxg5Eg"
            style="display:inline-block;background:#1A1612;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-size:15px;font-weight:500;margin-bottom:1.5rem;">
            Criar a página do meu pai →
          </a>
          <p style="font-size:13px;color:#A39E99;line-height:1.7;">
            Após preencher o formulário, você receberá o link da página em até alguns minutos.<br>
            Qualquer dúvida, responda esse e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:1.5rem 0;">
          <p style="font-size:12px;color:#A39E99;">
            🔒 Pra Sempre Pai · Seus dados estão protegidos conforme a LGPD.
          </p>
        </div>
      `,
    });

    console.log(`✅ E-mail enviado para ${emailCliente}`);
    res.sendStatus(200);

  } catch (error) {
    console.error('Erro no webhook:', error.message);
    res.sendStatus(500);
  }
});

// ─── ROTA PARA GERAR A PÁGINA FINAL ───
// Chamada após o cliente preencher o formulário do Tally
app.post('/gerar-pagina', async (req, res) => {
  try {
    const {
      nomeEnvio,
      mensagemAbertura,
      emailCliente,
      fotos, // array de URLs das fotos vindas do Tally
      legendas, // array de legendas
    } = req.body;

    // Gera um ID único para a página
    const paginaId = Math.random().toString(36).slice(2, 8);
    const linkPagina = `https://dia-dos-pais-virid.vercel.app/p/${paginaId}`;

    // Envia o link final para o cliente
    await transporter.sendMail({
      from: `"Pra Sempre Pai" <${process.env.EMAIL_USER}>`,
      to: emailCliente,
      subject: '🎁 A página do seu pai está pronta!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;color:#1A1612;">
          <h2 style="font-size:22px;margin-bottom:1rem;">A página está pronta! 🎉</h2>
          <p style="color:#6B6560;line-height:1.7;margin-bottom:1rem;">
            A surpresa para o seu pai está criada. Copie o link abaixo e envie para ele no Dia dos Pais:
          </p>
          <div style="background:#FDF6E7;border:1px solid #F0D89A;border-radius:10px;
            padding:1rem;font-family:monospace;font-size:14px;color:#C8973A;
            word-break:break-all;margin-bottom:1.5rem;">
            ${linkPagina}
          </div>
          <a href="${linkPagina}"
            style="display:inline-block;background:#1A1612;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-size:15px;font-weight:500;margin-bottom:1.5rem;">
            Ver a página do meu pai →
          </a>
          <p style="font-size:13px;color:#A39E99;line-height:1.7;">
            O link não expira — o seu pai pode acessar quando quiser, para sempre.<br>
            Qualquer dúvida, responda esse e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:1.5rem 0;">
          <p style="font-size:12px;color:#A39E99;">
            🔒 Pra Sempre Pai · Seus dados estão protegidos conforme a LGPD.
          </p>
        </div>
      `,
    });

    console.log(`✅ Página gerada: ${linkPagina} → ${emailCliente}`);
    res.json({ success: true, link: linkPagina });

  } catch (error) {
    console.error('Erro ao gerar página:', error.message);
    res.status(500).json({ error: 'Erro ao gerar página' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
