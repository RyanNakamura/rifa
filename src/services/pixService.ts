import { PixResponse } from '../types';

const SECRET_KEY = 'c6b41266-2357-4a6c-8e07-aa3873690c1a';
const PUBLIC_KEY = '4307a311-e352-47cd-9d24-a3c05e90db0d';
const API_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.purchase';
const STATUS_CHECK_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.getPayment';

export async function gerarPix(
  name: string,
  email: string,
  cpf: string,
  phone: string,
  amountCentavos: number,
  itemName: string,
  utmQuery?: string
): Promise<PixResponse> {
  // Log para verificar se utmQuery está chegando corretamente
  console.log('gerarPix recebendo utmQuery:', utmQuery);

  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
  }

  const requestBody = {
    name,
    email,
    cpf,
    phone,
    paymentMethod: 'PIX',
    amount: amountCentavos,
    traceable: true,
    utmQuery: utmQuery || '',
    items: [
      {
        unitPrice: amountCentavos,
        title: itemName,
        quantity: 1,
        tangible: false
      }
    ]
  };

  try {
    console.log('Enviando requisição PIX:', {
      url: API_URL,
      body: requestBody
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SECRET_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Status da resposta:', response.status);

    const responseText = await response.text();
    console.log('Resposta completa:', responseText);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Endpoint não encontrado na API GhostsPay. Por favor, tente novamente mais tarde.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique se as credenciais da GhostsPay estão corretas.');
      } else if (response.status === 500) {
        throw new Error('Erro no processamento do pagamento. Por favor, aguarde alguns minutos e tente novamente. Se o problema persistir, entre em contato com o suporte.');
      } else if (response.status === 0) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o servidor está online.');
      } else {
        const errorData = JSON.parse(responseText);
        throw new Error(`Erro no servidor: ${errorData.message || 'Erro desconhecido'}`);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Erro ao processar resposta do servidor. Por favor, tente novamente.');
    }

    if (!data.pixQrCode || !data.pixCode || !data.status || !data.id) {
      console.error('Resposta inválida:', data);
      throw new Error('Resposta incompleta do servidor. Por favor, tente novamente.');
    }

    return {
      pixQrCode: data.pixQrCode,
      pixCode: data.pixCode,
      status: data.status,
      id: data.id
    };
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Servidor GhostsPay indisponível. Por favor, tente novamente em alguns minutos.');
    }
    throw error;
  }
}

export async function verificarStatusPagamento(paymentId: string): Promise<string> {
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet.');
  }

  try {
    // Construir URL com query parameter
    const url = `${STATUS_CHECK_URL}?id=${encodeURIComponent(paymentId)}`;
    
    console.log('Verificando status do pagamento:', {
      url,
      paymentId
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': SECRET_KEY,
        'Accept': 'application/json'
      }
    });

    console.log('Status da resposta de verificação:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Pagamento não encontrado, retornando PENDING');
        return 'PENDING';
      } else if (response.status === 403) {
        console.error('Acesso negado ao verificar status');
        return 'PENDING';
      } else {
        console.error(`Erro ao verificar status: ${response.status}`);
        return 'PENDING';
      }
    }

    const responseText = await response.text();
    console.log('Resposta da verificação de status:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta de status:', e);
      return 'PENDING';
    }

    // A API GhostsPay retorna um objeto com: { "id": "string", "status": "PENDING", "method": "PIX", ... }
    const status = data.status || 'PENDING';
    console.log('Status do pagamento:', status);
    
    // Mapear possíveis status da API GhostsPay para nossos status internos
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'APPROVED';
      case 'PENDING':
        return 'PENDING';
      case 'CANCELLED':
      case 'CANCELED':
        return 'CANCELLED';
      case 'EXPIRED':
        return 'EXPIRED';
      default:
        return 'PENDING';
    }
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    // Em caso de erro, retornar PENDING para continuar o polling
    return 'PENDING';
  }
}