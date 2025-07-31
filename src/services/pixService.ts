import { PixResponse } from '../types';

const API_TOKEN = '31Im96H28n2r3vioZ3H4HCn2hBteURb5SiSvjJtDVmdfxi5SPX6tRuBXiJeL';
const API_BASE_URL = 'https://api.nitropagamentos.com/api/public/v1/transactions';

// Valores padrão para campos obrigatórios da NitroPagamentos
const DEFAULT_OFFER_HASH = 'plz1dopsjy'; // Hash da oferta configurado na conta NitroPagamentos
const DEFAULT_PRODUCT_HASH = 'mkckw16av6'; // Hash do produto configurado na conta NitroPagamentos
const DEFAULT_POSTBACK_URL = 'https://rifasuper.online/.netlify/functions/nitro-webhook'; // URL para receber atualizações da NitroPagamentos

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

  // Construir o corpo da requisição no formato da NitroPagamentos
  const requestBody = {
    amount: amountCentavos,
    offer_hash: DEFAULT_OFFER_HASH,
    payment_method: 'pix',
    customer: {
      name: name,
      email: email,
      phone_number: phone,
      document: cpf,
      // Campos de endereço obrigatórios - usando valores padrão
      // Em produção, estes deveriam ser coletados do usuário
      street_name: 'Rua Principal',
      number: 'S/N',
      complement: '',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01000000'
    },
    cart: [
      {
        product_hash: DEFAULT_PRODUCT_HASH,
        title: itemName,
        cover: null,
        price: amountCentavos,
        quantity: 1,
        operation_type: 1,
        tangible: false
      }
    ],
    installments: 1, // Para PIX sempre será 1
    expire_in_days: 1,
    postback_url: DEFAULT_POSTBACK_URL
  };

  // Adicionar UTM query se fornecida (como metadado personalizado)
  if (utmQuery) {
    (requestBody as any).utm_data = utmQuery;
  }

  try {
    console.log('Enviando requisição PIX para NitroPagamentos:', {
      url: `${API_BASE_URL}?api_token=${API_TOKEN}`,
      body: requestBody
    });

    const response = await fetch(`${API_BASE_URL}?api_token=${API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Status da resposta NitroPagamentos:', response.status);

    const responseText = await response.text();
    console.log('Resposta completa NitroPagamentos:', responseText);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Endpoint não encontrado na API NitroPagamentos. Por favor, tente novamente mais tarde.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique se o token da NitroPagamentos está correto.');
      } else if (response.status === 422) {
        throw new Error('Dados inválidos enviados para a NitroPagamentos. Verifique os dados do pagamento.');
      } else if (response.status === 500) {
        throw new Error('Erro no processamento do pagamento. Por favor, aguarde alguns minutos e tente novamente. Se o problema persistir, entre em contato com o suporte.');
      } else if (response.status === 0) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o servidor está online.');
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: 'Erro desconhecido' };
        }
        throw new Error(`Erro no servidor: ${errorData.message || 'Erro desconhecido'}`);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Erro ao processar resposta do servidor. Por favor, tente novamente.');
    }

    console.log('Dados parseados da NitroPagamentos:', data);

    // Mapear a resposta da NitroPagamentos para o formato esperado
    // A estrutura exata da resposta pode variar, ajuste conforme necessário
    const pixQrCode = data.pix_qr_code || data.qr_code || data.pixQrCode;
    const pixCode = data.pix_code || data.pix_copy_paste || data.pixCode;
    const status = data.status || 'pending';
    const id = data.hash || data.id || data.transaction_id;

    if (!pixQrCode || !pixCode || !id) {
      console.error('Resposta incompleta da NitroPagamentos:', data);
      throw new Error('Resposta incompleta do servidor. Por favor, tente novamente.');
    }

    return {
      pixQrCode: pixQrCode,
      pixCode: pixCode,
      status: status,
      id: id
    };
  } catch (error) {
    console.error('Erro ao gerar PIX na NitroPagamentos:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Servidor NitroPagamentos indisponível. Por favor, tente novamente em alguns minutos.');
    }
    throw error;
  }
}

export async function verificarStatusPagamento(paymentId: string): Promise<string> {
  if (!navigator.onLine) {
    throw new Error('Sem conexão com a internet.');
  }

  try {
    // Construir URL para consulta de transação na NitroPagamentos
    const url = `${API_BASE_URL}/${paymentId}?api_token=${API_TOKEN}`;
    
    console.log('Verificando status do pagamento na NitroPagamentos:', {
      url,
      paymentId
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Status da resposta de verificação NitroPagamentos:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Pagamento não encontrado na NitroPagamentos, retornando PENDING');
        return 'PENDING';
      } else if (response.status === 403) {
        console.error('Acesso negado ao verificar status na NitroPagamentos');
        return 'PENDING';
      } else {
        console.error(`Erro ao verificar status na NitroPagamentos: ${response.status}`);
        return 'PENDING';
      }
    }

    const responseText = await response.text();
    console.log('Resposta da verificação de status NitroPagamentos:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta de status da NitroPagamentos:', e);
      return 'PENDING';
    }

    // Mapear os status da NitroPagamentos para nossos status internos
    const status = data.status || 'pending';
    console.log('Status do pagamento na NitroPagamentos:', status);
    
    // Mapear possíveis status da API NitroPagamentos para nossos status internos
    // Ajuste conforme a documentação específica dos status da NitroPagamentos
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
      case 'completed':
        return 'APPROVED';
      case 'pending':
      case 'waiting_payment':
      case 'processing':
        return 'PENDING';
      case 'cancelled':
      case 'canceled':
      case 'failed':
        return 'CANCELLED';
      case 'expired':
      case 'timeout':
        return 'EXPIRED';
      default:
        console.log(`Status desconhecido da NitroPagamentos: ${status}, retornando PENDING`);
        return 'PENDING';
    }
  } catch (error) {
    console.error('Erro ao verificar status do pagamento na NitroPagamentos:', error);
    // Em caso de erro, retornar PENDING para continuar o polling
    return 'PENDING';
  }
}