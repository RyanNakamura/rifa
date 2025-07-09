import { supabase } from '../lib/supabase';

export interface PaymentStatus {
  status: 'pending' | 'approved' | 'failed';
  paymentId: string;
  message?: string;
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('status')
      .eq('payment_id', paymentId)
      .single();

    if (error) {
      throw new Error(`Erro ao consultar status: ${error.message}`);
    }
    
    if (data) {
      return {
        status: data.status === 'approved' ? 'approved' : 'pending',
        paymentId,
        message: data.status === 'approved' ? 'Pagamento aprovado!' : 'Aguardando pagamento...'
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