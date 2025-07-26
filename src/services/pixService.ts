import { PixResponse } from '../types';

// URLs da API - proxy para o backend Node.js
const PIX_API_URL = '/api/ghostspay/pix';
const PIX_STATUS_URL = '/api/ghostspay/pix-status';

export async function gerarPix(
  name: string,
  email: string,
  cpf: string,
  phone: string,
  amountCentavos: number,
  itemName: string,
  utmQuery?: string
): Promise<PixResponse> {
  console.log('gerarPix recebendo utmQuery:', utmQuery);

  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
  }

  const requestBody = {
    name,
    email,
    cpf,
    phone,
    paymentMethod: 'PIX' as const,
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

  // Headers simples - autenticação é feita pelo proxy/backend
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    console.log('Enviando requisição PIX para backend Node.js:', {
      url: PIX_API_URL,
      body: requestBody
    });

    const response = await fetch(PIX_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log('Status da resposta do backend Node.js:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('Erro do backend Node.js:', errorData);
      
      if (response.status === 404) {
        throw new Error('API não encontrada. Por favor, tente novamente mais tarde.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Por favor, tente novamente.');
      } else if (response.status === 500) {
        throw new Error('Erro no processamento do pagamento. Por favor, aguarde alguns minutos e tente novamente.');
      } else {
        throw new Error(errorData.error || 'Erro no servidor. Por favor, tente novamente.');
      }
    }

    const data = await response.json();
    console.log('Resposta do backend Node.js:', data);

    if (!data.pixQrCode || !data.pixCode || !data.status || !data.id) {
      console.error('Resposta inválida do backend Node.js:', data);
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
      throw new Error('Erro de conectividade. Verifique sua conexão com a internet e tente novamente.');
    }
    throw error;
  }
}

export async function verificarStatusPagamento(paymentId: string): Promise<string> {
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet.');
  }

  try {
    const url = `${PIX_STATUS_URL}?id=${encodeURIComponent(paymentId)}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    console.log('Verificando status do pagamento:', {
      url,
      paymentId
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    console.log('Status da resposta de verificação:', response.status);

    if (!response.ok) {
      console.error(`Erro ao verificar status: ${response.status}`);
      return 'PENDING';
    }

    const data = await response.json();
    console.log('Resposta da verificação de status:', data);

    const status = data.status || 'PENDING';
    console.log('Status do pagamento:', status);
    
    return status;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    // Em caso de erro, retornar PENDING para continuar o polling
    return 'PENDING';
  }
}