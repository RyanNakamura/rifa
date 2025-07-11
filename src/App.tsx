import React, { useState, useEffect } from 'react';
import { Check, Copy, Clock, AlertCircle, Car, Bike, Trophy, Star, Users, Shield, Zap, Gift } from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

// Função auxiliar para capturar UTMs do sessionStorage
const getUtmParamsFromSession = () => {
  const sessionDataRaw = sessionStorage.getItem('PREVIOUS_PAGE_VIEW');
  let utmQuery = '';

  if (sessionDataRaw) {
    try {
      // O valor é um array que contém uma string JSON
      const sessionArray = JSON.parse(sessionDataRaw);
      if (Array.isArray(sessionArray) && sessionArray.length > 0) {
        const sessionObject = JSON.parse(sessionArray[0]);

        const clickId = sessionObject.click_id;
        const utmSource = sessionObject.utm_source;
        // Adicione outros parâmetros UTM aqui se eles forem relevantes e existirem no objeto
        // const utmMedium = sessionObject.utm_medium;
        // const utmCampaign = sessionObject.utm_campaign;

        const params = [];
        if (clickId) {
          params.push(`click_id=${encodeURIComponent(clickId)}`);
        }
        if (utmSource) {
          params.push(`utm_source=${encodeURIComponent(utmSource)}`);
        }
        // Adicione outros parâmetros se extraídos
        // if (utmMedium) { params.push(`utm_medium=${encodeURIComponent(utmMedium)}`); }
        // if (utmCampaign) { params.push(`utm_campaign=${encodeURIComponent(utmCampaign)}`); }

        utmQuery = params.join('&');

        console.log('Dados brutos do sessionStorage (PREVIOUS_PAGE_VIEW):', sessionDataRaw);
        console.log('Objeto parseado do sessionStorage:', sessionObject);
        console.log('UTM Query construída para envio:', utmQuery);
      }
    } catch (error) {
      console.error('Erro ao parsear dados do sessionStorage:', error);
      // Em caso de erro, utmQuery permanecerá vazia, o que é um fallback seguro.
    }
  }
  return utmQuery;
};

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface PixData {
  pixQrCode: string;
  pixCode: string;
  status: string;
  id: string;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'form' | 'payment' | 'success'>('form');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'APPROVED' | 'CANCELLED' | 'EXPIRED'>('PENDING');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
    } else if (name === 'phone') {
      const numbers = value.replace(/\D/g, '');
      let formattedPhone = numbers;
      
      if (numbers.length <= 2) {
        formattedPhone = numbers;
      } else if (numbers.length <= 7) {
        formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      } else if (numbers.length <= 11) {
        formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      } else {
        formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      }
      
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validar CPF
      const cleanedCpf = cleanCpf(formData.cpf);
      const cpfValidation = await validateCpf(cleanedCpf);
      
      if (!cpfValidation.valid) {
        throw new Error(cpfValidation.message || 'CPF inválido');
      }

      // Capturar UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();

      // Gerar PIX
      const pixResponse = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        formData.phone.replace(/\D/g, ''),
        100, // R$ 1,00 em centavos
        'Super Rifa - SW4 0KM + Moto BMW',
        utmQuery // Passar o utmQuery capturado
      );

      setPixData(pixResponse);
      setCurrentStep('payment');
      
      // Iniciar verificação de status
      setIsCheckingPayment(true);
      startPaymentStatusCheck(pixResponse.id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        setPaymentStatus(status as any);
        
        if (status === 'APPROVED') {
          setIsCheckingPayment(false);
          setShowSuccessScreen(true);
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    };

    // Verificar imediatamente
    checkStatus();
    
    // Verificar a cada 5 segundos
    const interval = setInterval(checkStatus, 5000);
    
    // Parar após 10 minutos
    setTimeout(() => {
      clearInterval(interval);
      setIsCheckingPayment(false);
    }, 600000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Pagamento Aprovado';
      case 'PENDING':
        return 'Aguardando Pagamento';
      case 'CANCELLED':
        return 'Pagamento Cancelado';
      case 'EXPIRED':
        return 'Pagamento Expirado';
      default:
        return 'Status Desconhecido';
    }
  };

  if (showSuccessScreen) {
    return <PaymentSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/70"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-8 w-16 h-16 bg-yellow-400 rounded-full opacity-20 animate-bounce"></div>
      <div className="absolute top-60 right-8 w-12 h-12 bg-white rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute bottom-40 left-6 w-8 h-8 bg-green-400 rounded-full opacity-30 animate-bounce delay-200"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold mb-3 animate-pulse">
            <Zap className="w-4 h-4" />
            SUPER PROMOÇÃO
          </div>
          <h1 className="text-3xl font-black text-white mb-2 leading-tight">
            🚗 SW4 0KM + 🏍️ MOTO BMW
          </h1>
          <p className="text-white/80 text-lg">
            Por apenas <span className="text-yellow-300 font-bold text-xl">R$ 1,00</span>
          </p>
        </div>

        {/* Prize Images */}
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-md mx-auto">
          <div className="relative overflow-hidden rounded-xl border-4 border-yellow-400 shadow-xl">
            <img 
              src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=400" 
              alt="SW4 Toyota" 
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-1 left-2 text-white text-xs font-bold">SW4 0KM</div>
          </div>
          <div className="relative overflow-hidden rounded-xl border-4 border-yellow-400 shadow-xl">
            <img 
              src="https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=400" 
              alt="BMW Moto" 
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-1 left-2 text-white text-xs font-bold">BMW</div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-6 max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <span className="text-white text-xs font-medium">Seguro</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <span className="text-white text-xs font-medium">+50k</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <span className="text-white text-xs font-medium">5.0★</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <Gift className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <span className="text-white text-xs font-medium">Prêmios</span>
          </div>
        </div>

        {currentStep === 'form' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
              <div className="text-center mb-4">
                <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-white mb-1">Participe Agora!</h2>
                <p className="text-white/80 text-sm">Preencha seus dados para concorrer</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="E-mail"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="cpf"
                    placeholder="CPF"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    maxLength={14}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Telefone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-100 text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-yellow-800 font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-yellow-800 border-t-transparent rounded-full animate-spin"></div>
                      Processando...
                    </div>
                  ) : (
                    'PARTICIPAR POR R$ 1,00'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-white/60 text-xs">
                  🔒 Pagamento 100% seguro via PIX
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'payment' && pixData && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">PIX</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Pagamento PIX</h2>
                <p className="text-gray-600 text-sm">Escaneie o QR Code ou copie o código</p>
              </div>

              {/* Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  {isCheckingPayment && paymentStatus === 'PENDING' && (
                    <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
                  )}
                  {paymentStatus === 'APPROVED' && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  {(paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${getStatusColor(paymentStatus)}`}>
                    {getStatusText(paymentStatus)}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="mb-4 p-4 bg-white border-2 border-gray-200 rounded-xl">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              </div>

              {/* PIX Code */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código PIX (Copia e Cola)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.pixCode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(pixData.pixCode)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-800 mb-2">Como pagar:</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escolha a opção PIX</li>
                  <li>3. Escaneie o QR Code ou cole o código</li>
                  <li>4. Confirme o pagamento de R$ 1,00</li>
                </ol>
              </div>

              {isCheckingPayment && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-yellow-600">
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Aguardando confirmação do pagamento...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;