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
    console.log('Webhook da NitroPagamentos recebido:', JSON.stringify(payload, null, 2));

    // Validar se o payload contém os campos necessários
    if (!payload.hash || !payload.status) {
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
      status: payload.status,
      customer: payload.customer
    });

    // Se o pagamento foi aprovado, você pode adicionar lógica personalizada aqui
    if (payload.status.toLowerCase() === 'approved' || 
        payload.status.toLowerCase() === 'paid' || 
        payload.status.toLowerCase() === 'completed') {
      console.log('Pagamento aprovado para:', payload.customer?.email);
      // Adicione aqui qualquer lógica personalizada para pagamentos aprovados
      // Por exemplo: enviar email, atualizar sistema externo, etc.
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
        status: payload.status
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