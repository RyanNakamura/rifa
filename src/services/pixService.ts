import { PixResponse } from '../types';

// Use Supabase Edge Functions instead of direct API calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const GENERATE_PIX_URL = `${SUPABASE_URL}/functions/v1/generate-pix`;
const CHECK_STATUS_URL = `${SUPABASE_URL}/functions/v1/check-payment-status`;

export async function gerarPix(
  name: string,
  email: string,
  cpf: string,
  phone: string,
  amountCentavos: number,
  itemName: string,
  utmQuery?: string
): Promise<PixResponse> {
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
    const response = await fetch(GENERATE_PIX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Erro no servidor de pagamento';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Use default error message
      }
      throw new Error(errorMessage);
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
      throw new Error('Servidor de pagamento indisponível. Por favor, tente novamente em alguns minutos.');
    }
    throw error;
  }
}

export async function verificarStatusPagamento(paymentId: string): Promise<string> {
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet.');
  }

  try {
    const url = `${CHECK_STATUS_URL}?id=${encodeURIComponent(paymentId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Erro ao verificar status: ${response.status}`);
      return 'PENDING';
    }

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta de status:', e);
      return 'PENDING';
    }

    return data.status || 'PENDING';
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return 'PENDING';
  }
}