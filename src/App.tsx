import React, { useState, useEffect } from 'react';
import { Car, Gift, Clock, CheckCircle, AlertCircle, Copy, QrCode, Loader2 } from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { PixResponse } from './types';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

type AppState = 'form' | 'pix' | 'success';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Verificação de status do pagamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (pixData && paymentStatus === 'PENDING' && currentState === 'pix') {
      setCheckingPayment(true);
      
      interval = setInterval(async () => {
        try {
          const status = await verificarStatusPagamento(pixData.id);
          console.log('Status verificado:', status);
          setPaymentStatus(status);
          
          if (status === 'APPROVED') {
            setCheckingPayment(false);
            setCurrentState('success');
            clearInterval(interval);
          } else if (status === 'CANCELLED' || status === 'EXPIRED') {
            setCheckingPayment(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 3000); // Verifica a cada 3 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [pixData, paymentStatus, currentState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Nome é obrigatório';
    if (!formData.email.trim()) return 'Email é obrigatório';
    if (!formData.email.includes('@')) return 'Email inválido';
    if (!formData.cpf.trim()) return 'CPF é obrigatório';
    if (formData.cpf.replace(/\D/g, '').length !== 11) return 'CPF deve ter 11 dígitos';
    if (!formData.phone.trim()) return 'Telefone é obrigatório';
    if (formData.phone.replace(/\D/g, '').length < 10) return 'Telefone inválido';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const utmQuery = window.location.search;
      const cleanCPF = formData.cpf.replace(/\D/g, '');
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      const response = await gerarPix(
        formData.name,
        formData.email,
        cleanCPF,
        cleanPhone,
        100, // R$ 1,00 em centavos
        'Super Rifa - SW4 0KM + Moto BMW',
        utmQuery
      );

      setPixData(response);
      setPaymentStatus('PENDING');
      setCurrentState('pix');
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setError(error instanceof Error ? error.message : 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  const handleBackToForm = () => {
    setCurrentState('form');
    setPixData(null);
    setPaymentStatus('PENDING');
    setCheckingPayment(false);
    setError('');
  };

  const handleCloseSuccess = () => {
    setCurrentState('form');
    setPixData(null);
    setPaymentStatus('PENDING');
    setCheckingPayment(false);
    setError('');
    setFormData({
      name: '',
      email: '',
      cpf: '',
      phone: ''
    });
  };

  if (currentState === 'success') {
    return <PaymentSuccessScreen onClose={handleCloseSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-green-400"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center py-6 px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car className="w-12 h-12 text-yellow-400" />
            <h1 className="text-3xl font-black text-white">Super Rifa</h1>
          </div>
          <p className="text-white/80 text-lg">Concorra a SW4 0KM + Moto BMW</p>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="w-full max-w-md">
            {currentState === 'form' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-center mb-6">
                  <div className="w-48 h-32 mx-auto mb-4 rounded-xl overflow-hidden shadow-xl">
                    <img 
                      src="/sw4-car.jpg" 
                      alt="SW4 0KM" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Apenas R$ 1,00 por número!
                  </h2>
                  <p className="text-white/80">
                    Sorteio transparente e auditado pela LOTEP
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      name="cpf"
                      placeholder="CPF"
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      maxLength={14}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      name="phone"
                      placeholder="Telefone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      maxLength={15}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-500 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="text-red-800 text-sm">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-800 font-bold py-3 px-6 rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5" />
                        Participar por R$ 1,00
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {currentState === 'pix' && pixData && (
              <div className="bg-white rounded-2xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    PIX Gerado com Sucesso!
                  </h2>
                  <p className="text-gray-600">
                    Escaneie o QR Code ou copie o código PIX
                  </p>
                </div>

                {/* Status do pagamento */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {checkingPayment ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    ) : paymentStatus === 'APPROVED' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium text-gray-700">
                      {checkingPayment ? 'Verificando pagamento...' : 
                       paymentStatus === 'APPROVED' ? 'Pagamento aprovado!' :
                       paymentStatus === 'CANCELLED' ? 'Pagamento cancelado' :
                       paymentStatus === 'EXPIRED' ? 'PIX expirado' :
                       'Aguardando pagamento'}
                    </span>
                  </div>
                  {checkingPayment && (
                    <p className="text-sm text-gray-500 text-center">
                      Verificando automaticamente...
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="mb-6 text-center">
                  <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                    <img 
                      src={pixData.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                </div>

                {/* PIX Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código PIX:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pixData.pixCode}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={copyPixCode}
                      className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-blue-800 mb-2">Como pagar:</h3>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Abra o app do seu banco</li>
                    <li>2. Escolha a opção PIX</li>
                    <li>3. Escaneie o QR Code ou cole o código</li>
                    <li>4. Confirme o pagamento de R$ 1,00</li>
                  </ol>
                </div>

                <button
                  onClick={handleBackToForm}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 px-4">
          <p className="text-white/60 text-sm">
            Sorteio realizado de forma transparente e auditada
          </p>
        </footer>
      </div>
    </div>
  );
}