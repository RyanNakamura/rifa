const { createClient } = require('@supabase/supabase-js');

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

    // Inicializar cliente Supabase (se você estiver usando)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Mapear status da NitroPagamentos para status interno
      let internalStatus = 'pending';
      switch (payload.status.toLowerCase()) {
        case 'approved':
        case 'paid':
        case 'completed':
          internalStatus = 'approved';
          break;
        case 'pending':
        case 'waiting_payment':
        case 'processing':
          internalStatus = 'pending';
          break;
        case 'cancelled':
        case 'canceled':
        case 'failed':
          internalStatus = 'cancelled';
          break;
        case 'expired':
        case 'timeout':
          internalStatus = 'expired';
          break;
      }

      // Atualizar status da transação no banco de dados
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          status: internalStatus,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', payload.hash)
        .select();

      if (error) {
        console.error('Erro ao atualizar transação no Supabase:', error);
        // Não retornar erro para não fazer a NitroPagamentos reenviar o webhook
      } else {
        console.log('Transação atualizada com sucesso:', data);
      }

      // Se o pagamento foi aprovado, executar lógica adicional
      if (internalStatus === 'approved' && payload.customer) {
        try {
          // Chamar função para liberar acesso ao usuário
          const { error: accessError } = await supabase.rpc('liberar_acesso_ao_usuario', {
            user_email: payload.customer.email,
            p_payment_id: payload.hash
          });

          if (accessError) {
            console.error('Erro ao liberar acesso ao usuário:', accessError);
          } else {
            console.log('Acesso liberado para o usuário:', payload.customer.email);
          }
        } catch (accessErr) {
          console.error('Erro na liberação de acesso:', accessErr);
        }
      }
    } else {
      console.log('Supabase não configurado - apenas logando o webhook');
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