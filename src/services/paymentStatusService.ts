export interface PaymentStatus {
  status: 'pending' | 'approved' | 'failed';
  paymentId: string;
  message?: string;
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/transactions?payment_id=eq.${paymentId}&select=status`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const transaction = data[0];
      return {
        status: transaction.status === 'approved' ? 'approved' : 'pending',
        paymentId,
        message: transaction.status === 'approved' ? 'Pagamento aprovado!' : 'Aguardando pagamento...'
      };
    }

    return {
      status: 'pending',
      paymentId,
      message: 'Aguardando pagamento...'
    };
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return {
      status: 'pending',
      paymentId,
      message: 'Erro ao verificar status'
    };
  }
}