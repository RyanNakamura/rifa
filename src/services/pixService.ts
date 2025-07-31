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

  // Construir a postback_url com UTMs se disponíveis
  let postbackUrl = DEFAULT_POSTBACK_URL;
  if (utmQuery && utmQuery.trim() !== '') {
    // Verificar se a URL já tem parâmetros
    const separator = postbackUrl.includes('?') ? '&' : '?';
    postbackUrl = `${postbackUrl}${separator}${utmQuery}`;
    console.log('Postback URL com UTMs:', postbackUrl);
  }

  // Construir o corpo da requisição no formato exato da NitroPagamentos
  const requestBody = {
    amount: amountCentavos,
    offer_hash: DEFAULT_OFFER_HASH,
    payment_method: 'pix',
    customer: {
      name: name,
      email: email,
      phone_number: phone,
      document: cpf,
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
    installments: 1,
    expire_in_days: 1,
    postback_url: postbackUrl
  };

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
      let errorMessage = 'Erro desconhecido';
      
      try {
        const errorData = JSON.parse(responseText);
        console.error('Erro detalhado da NitroPagamentos:', errorData);
        
        // Tratar diferentes tipos de erro da API
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          // Se há erros de validação, mostrar o primeiro erro
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          }
        }
      } catch (e) {
        console.error('Erro ao parsear resposta de erro:', e);
        errorMessage = `Erro HTTP ${response.status}: ${responseText}`;
      }

      if (response.status === 404) {
        throw new Error('Endpoint não encontrado na API NitroPagamentos. Verifique a configuração.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Token de API inválido ou sem permissão. Verifique as credenciais.');
      } else if (response.status === 422) {
        throw new Error(`Dados inválidos: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error('Erro interno do servidor NitroPagamentos. Tente novamente em alguns minutos.');
      } else {
        throw new Error(`Erro na API: ${errorMessage}`);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e);
      throw new Error('Resposta inválida do servidor. Tente novamente.');
    }

    console.log('Dados parseados da NitroPagamentos:', data);

    // Mapear a resposta da NitroPagamentos para o formato esperado
    // Baseado na resposta real da API, os dados do PIX estão no objeto 'pix'
    // O pix_qr_code da NitroPagamentos é o código PIX (string), não uma imagem
    const pixCode = data.pix?.pix_qr_code || data.pix?.pix_code || data.pix?.pix_copy_paste;
    const status = data.payment_status || 'pending';
    const id = data.hash || data.id || data.transaction_id;

    // Debug dos campos encontrados
    console.log('Campos extraídos:', {
      pixCode,
      status,
      id,
      pixObject: data.pix
    });

    if (!pixCode) {
      console.error('Código PIX não encontrado. Dados do PIX:', data.pix);
      throw new Error('Código PIX não encontrado na resposta do servidor.');
    }

    if (!id) {
      console.error('Resposta incompleta da NitroPagamentos - falta ID da transação:', data);
      throw new Error('Resposta incompleta do servidor - ID da transação não encontrado.');
    }

    return {
      pixQrCode: pixCode, // Usar o código PIX para gerar QR Code no frontend
      pixCode: pixCode,
      status: status,
      id: id
    };
  } catch (error) {
    console.error('Erro ao gerar PIX na NitroPagamentos:', error);
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Não foi possível conectar com o servidor de pagamentos. Verifique sua conexão e tente novamente.');
    }
    
    // Re-throw the error if it's already a custom error message
    if (error.message && !error.message.includes('Failed to fetch')) {
      throw error;
    }
    
    throw new Error('Erro inesperado ao processar pagamento. Tente novamente.');
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
      } else if (response.status === 403 || response.status === 401) {
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
    const status = data.payment_status || 'pending';
    console.log('Status do pagamento na NitroPagamentos:', status);
    
    // Mapear possíveis status da API NitroPagamentos para nossos status internos
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
      case 'completed':
      case 'success':
        return 'APPROVED';
      case 'pending':
      case 'waiting_payment':
      case 'processing':
      case 'created':
        return 'PENDING';
      case 'cancelled':
      case 'canceled':
      case 'failed':
      case 'rejected':
        return 'CANCELLED';
      case 'expired':
      case 'timeout':
      case 'overdue':
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