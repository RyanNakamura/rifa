import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.backend' });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://rifasuper.shop'],
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json());

// Chaves da API GhostsPay (vindas das variáveis de ambiente)
const SECRET_KEY = process.env.GHOSTSPAY_SECRET_KEY;
const PUBLIC_KEY = process.env.GHOSTSPAY_PUBLIC_KEY;

if (!SECRET_KEY || !PUBLIC_KEY) {
  console.error('ERRO: Chaves da API GhostsPay não encontradas nas variáveis de ambiente!');
  console.error('Certifique-se de configurar GHOSTSPAY_SECRET_KEY e GHOSTSPAY_PUBLIC_KEY no arquivo .env.backend');
  process.exit(1);
}

// URLs da API GhostsPay
const GHOSTSPAY_API_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.purchase';
const GHOSTSPAY_STATUS_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.getPayment';

// Endpoint para gerar PIX
app.post('/api/ghostspay/pix', async (req, res) => {
  try {
    console.log('Recebida requisição PIX:', {
      email: req.body.email,
      amount: req.body.amount,
      utmQuery: req.body.utmQuery
    });

    // Validar campos obrigatórios
    const { name, email, cpf, phone, amount, items } = req.body;
    
    if (!name || !email || !cpf || !phone || !amount || !items) {
      return res.status(400).json({ 
        error: "Campos obrigatórios não preenchidos" 
      });
    }

    // Preparar dados para a API GhostsPay
    const requestBody = {
      name,
      email,
      cpf,
      phone,
      paymentMethod: 'PIX',
      amount,
      traceable: true,
      utmQuery: req.body.utmQuery || '',
      items
    };

    // Fazer requisição para a API GhostsPay
    const response = await fetch(GHOSTSPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SECRET_KEY,
        'X-Public-Key': PUBLIC_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Status da resposta GhostsPay:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da GhostsPay:', errorText);
      
      let errorMessage = 'Erro no processamento do pagamento';
      
      if (response.status === 404) {
        errorMessage = 'API não encontrada. Por favor, tente novamente mais tarde.';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado. Verifique se as chaves de API estão corretas.';
      } else if (response.status === 500) {
        errorMessage = 'Erro no servidor. Por favor, aguarde alguns minutos e tente novamente.';
      }

      return res.status(response.status).json({ error: errorMessage });
    }

    const responseText = await response.text();
    console.log('Resposta da GhostsPay:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta da GhostsPay:', e);
      return res.status(500).json({ 
        error: 'Erro ao processar resposta do servidor' 
      });
    }

    // Validar estrutura da resposta
    if (!data.pixQrCode || !data.pixCode || !data.status || !data.id) {
      console.error('Resposta inválida da GhostsPay:', data);
      return res.status(500).json({ 
        error: 'Resposta incompleta do servidor' 
      });
    }

    // Retornar resposta de sucesso
    res.json({
      pixQrCode: data.pixQrCode,
      pixCode: data.pixCode,
      status: data.status,
      id: data.id
    });

  } catch (error) {
    console.error('Erro no endpoint PIX:', error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: error.message 
    });
  }
});

// Endpoint para verificar status do pagamento
app.get('/api/ghostspay/pix-status', async (req, res) => {
  try {
    const paymentId = req.query.id;

    if (!paymentId) {
      return res.status(400).json({ 
        error: "ID do pagamento é obrigatório" 
      });
    }

    console.log('Verificando status do pagamento:', paymentId);

    // Fazer requisição para a API GhostsPay
    const statusUrl = `${GHOSTSPAY_STATUS_URL}?id=${encodeURIComponent(paymentId)}`;
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': SECRET_KEY,
        'X-Public-Key': PUBLIC_KEY,
        'Accept': 'application/json'
      }
    });

    console.log('Status da resposta de verificação:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Pagamento não encontrado, retornando PENDING');
        return res.json({ status: 'PENDING' });
      } else if (response.status === 403) {
        console.error('Acesso negado ao verificar status');
        return res.json({ status: 'PENDING' });
      } else {
        console.error(`Erro ao verificar status: ${response.status}`);
        return res.json({ status: 'PENDING' });
      }
    }

    const responseText = await response.text();
    console.log('Resposta da verificação de status:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta de status:', e);
      return res.json({ status: 'PENDING' });
    }

    // Mapear status da API para nosso formato interno
    const status = data.status || 'PENDING';
    let mappedStatus = 'PENDING';

    switch (status.toUpperCase()) {
      case 'APPROVED':
        mappedStatus = 'APPROVED';
        break;
      case 'PENDING':
        mappedStatus = 'PENDING';
        break;
      case 'CANCELLED':
      case 'CANCELED':
        mappedStatus = 'CANCELLED';
        break;
      case 'EXPIRED':
        mappedStatus = 'EXPIRED';
        break;
      default:
        mappedStatus = 'PENDING';
    }

    console.log('Status do pagamento:', mappedStatus);

    res.json({ status: mappedStatus });

  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    // Em caso de erro, retornar PENDING para continuar o polling
    res.json({ status: 'PENDING' });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Rifa Backend API'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 PIX endpoint: http://localhost:${PORT}/api/ghostspay/pix`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/ghostspay/pix-status`);
});