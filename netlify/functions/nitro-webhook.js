exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Apenas aceita requisições POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse do payload do webhook
    const payload = JSON.parse(event.body);
    
    // Extrair parâmetros UTM da URL
    const queryParams = event.queryStringParameters || {};
    const utmParams = {
      utm_source: queryParams.utm_source || null,
      utm_medium: queryParams.utm_medium || null,
      utm_campaign: queryParams.utm_campaign || null,
      utm_term: queryParams.utm_term || null,
      utm_content: queryParams.utm_content || null,
      click_id: queryParams.click_id || null
    };
    
    console.log('Webhook da NitroPagamentos recebido:', JSON.stringify(payload, null, 2));
    console.log('Parâmetros UTM recebidos:', JSON.stringify(utmParams, null, 2));

    // Validar se o payload contém os campos necessários
    if (!payload.hash || !payload.payment_status) {
      console.error('Payload inválido - faltam campos obrigatórios:', payload);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payload inválido' }),
      };
    }

    // Processar webhook da NitroPagamentos
    console.log('Processando webhook da NitroPagamentos:', {
      transaction_id: payload.hash,
      status: payload.payment_status,
      customer: payload.customer,
      utm_params: utmParams
    });

    // Se o pagamento foi aprovado, você pode adicionar lógica personalizada aqui
    if (payload.payment_status.toLowerCase() === 'approved' || 
        payload.payment_status.toLowerCase() === 'paid' || 
        payload.payment_status.toLowerCase() === 'completed') {
      console.log('Pagamento aprovado para:', payload.customer?.email);
      // Adicione aqui qualquer lógica personalizada para pagamentos aprovados
      // Por exemplo: enviar email, atualizar sistema externo, etc.
      
      // Exemplo: Log dos UTMs para pagamentos aprovados
      if (utmParams.utm_source || utmParams.click_id) {
        console.log('UTMs do pagamento aprovado:', utmParams);
      }
    }

    // Aqui você pode adicionar outras lógicas, como:
    // - Enviar email de confirmação
    // - Atualizar sistema de CRM
    // - Disparar outras integrações
    // - Etc.

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Webhook processado com sucesso',
        transaction_id: payload.hash,
        status: payload.payment_status,
        utm_params: utmParams
      }),
    };

  } catch (error) {
    console.error('Erro ao processar webhook da NitroPagamentos:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
    };
  }
};