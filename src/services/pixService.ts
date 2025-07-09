import { PixResponse } from '../types';

const SECRET_KEY = 'ada7f14f-f602-47be-bdd9-d14f559c76e5';
const API_URL = 'https://pay.rushpayoficial.com/api/v1/transaction.purchase';

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
        throw new Error('API não encontrada. Por favor, tente novamente mais tarde.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique se a chave de API está correta.');
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
      throw new Error('Servidor indisponível. Por favor, tente novamente em alguns minutos.');
    }
    throw error;
  }
}

// Função para salvar transação no banco de dados
async function saveTransactionToDatabase(
  paymentId: string,
  userData: any,
  selectedPackage: any,
  cpf: string,
  phone: string
) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Configuração do Supabase não encontrada');
      return;
    }

    // Primeiro, criar ou atualizar o cliente
    const customerData = {
      name: userData?.nome || 'Cliente',
      email: userData?.email || `${userData?.nome?.toLowerCase().replace(/\s+/g, '')}@email.com` || 'cliente@superrifa.com',
      cpf: cpf,
      phone: phone
    };

    const customerResponse = await fetch(`${supabaseUrl}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(customerData)
    });

    let customerId = null;
    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      customerId = customerResult[0]?.id;
    }

    // Criar transação
    const transactionData = {
      payment_id: paymentId,
      customer_id: customerId,
      status: 'pending',
      payment_method: 'PIX',
      total_value: selectedPackage.price * 100, // em centavos
    };

    await fetch(`${supabaseUrl}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });

  } catch (error) {
    console.error('Erro ao salvar transação:', error);
    // Não interromper o fluxo se houver erro ao salvar
  }
}