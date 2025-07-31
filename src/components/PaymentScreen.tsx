import React, { useState, useEffect } from 'react';
import { Copy, Clock, CheckCircle } from 'lucide-react';
import { PixResponse } from '../types';
import { verificarStatusPagamento } from '../services/pixService';

interface PaymentScreenProps {
  pixData: PixResponse;
  onPaymentConfirmed: () => void;
  purchasedNumbers: number;
  totalAmount: number;
  customerName: string;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  pixData,
  onPaymentConfirmed,
  purchasedNumbers,
  totalAmount,
  customerName
}) => {
  const [paymentStatus, setPaymentStatus] = useState(pixData.status || 'PENDING');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos em segundos
  const [pixCopied, setPixCopied] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!pixData?.id || paymentStatus === 'APPROVED' || paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') {
      return;
    }

    setIsCheckingPayment(true);
    
    const checkPaymentStatus = async () => {
      try {
        const status = await verificarStatusPagamento(pixData.id);
        console.log('Status do pagamento verificado:', status);
        setPaymentStatus(status);
        
        if (status === 'APPROVED') {
          setIsCheckingPayment(false);
          onPaymentConfirmed();
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    };

    // Verificar imediatamente
    checkPaymentStatus();

    // Configurar polling a cada 3 segundos
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => {
      clearInterval(interval);
      setIsCheckingPayment(false);
    };
  }, [pixData?.id, paymentStatus, onPaymentConfirmed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixData.pixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar código PIX:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
        
        {/* Header com Status */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💳</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Falta pouco! Copie e cole o código
          </h1>
          <p className="text-gray-600 text-sm">
            no seu app de pagamentos ou Internet Banking
          </p>
        </div>

        {/* Código PIX */}
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-3 text-center">
            Copie o código PIX abaixo:
          </label>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-mono text-gray-700 break-all leading-relaxed">
              {pixData.pixCode}
            </div>
          </div>
          <button
            onClick={copyPixCode}
            className={`w-full font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              pixCopied 
                ? 'bg-green-500 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {pixCopied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                CÓDIGO COPIADO!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                COPIAR CÓDIGO PIX
              </>
            )}
          </button>
        </div>

        {/* Timer */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-bold">Expira em:</span>
          </div>
          <div className="text-3xl font-black text-red-600">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Status do Pagamento */}
        {paymentStatus === 'PENDING' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2">
              {isCheckingPayment && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
              <p className="text-sm text-blue-700 font-medium">
                Aguardando pagamento...
              </p>
            </div>
          </div>
        )}

        {/* Resumo da Compra */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Resumo da Compra</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Comprador:</span>
              <span className="font-medium text-gray-800">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sorteio:</span>
              <span className="font-medium text-gray-800">SW4 0KM + Moto BMW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantidade:</span>
              <span className="font-medium text-gray-800">{purchasedNumbers} bilhetes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor por bilhete:</span>
              <span className="font-medium text-gray-800">R$ 0,50</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span className="text-gray-800">Total:</span>
                <span className="text-gray-800">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
              <span className="font-medium">Bilhetes:</span> Disponível após pagamento
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h4 className="font-bold text-amber-800 mb-2">📱 Como pagar:</h4>
          <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
            <li>Copie o código PIX acima</li>
            <li>Abra seu app do banco</li>
            <li>Escolha a opção PIX</li>
            <li>Cole o código e confirme</li>
            <li>Pronto! Seus números serão liberados</li>
          </ol>
        </div>

        {/* Rodapé */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Pagamento processado de forma segura
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;