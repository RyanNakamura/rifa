import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Car, 
  Bike, 
  Trophy, 
  Clock, 
  Users, 
  CheckCircle, 
  Copy, 
  QrCode,
  Loader2,
  X
} from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { PixResponse } from './types';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);

  // Get UTM parameters from URL
  const getUtmQuery = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = [];
    
    for (const [key, value] of urlParams.entries()) {
      if (key.startsWith('utm_') || key === 'click_id') {
        utmParams.push(`${key}=${encodeURIComponent(value)}`);
      }
    }
    
    return utmParams.join('&');
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

  const handleInputChange = (field: keyof FormData, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const validateForm = () => {
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    const phoneNumbers = formData.phone.replace(/\D/g, '');
    
    return (
      formData.name.trim() !== '' &&
      formData.email.includes('@') &&
      cpfNumbers.length === 11 &&
      phoneNumbers.length >= 10 &&
      selectedNumbers.length > 0
    );
  };

  const generateNumbers = () => {
    const numbers = [];
    for (let i = 1; i <= 100000; i++) {
      numbers.push(i);
    }
    return numbers;
  };

  const allNumbers = generateNumbers();

  const toggleNumber = (number: number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else {
        return [...prev, number];
      }
    });
  };

  const selectRandomNumbers = (count: number) => {
    const availableNumbers = allNumbers.filter(n => !selectedNumbers.includes(n));
    const randomNumbers = [];
    
    for (let i = 0; i < count && availableNumbers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNumber = availableNumbers[randomIndex];
      randomNumbers.push(selectedNumber);
      availableNumbers.splice(randomIndex, 1);
    }
    
    setSelectedNumbers(prev => [...prev, ...randomNumbers]);
  };

  const handleGeneratePix = async () => {
    if (!validateForm()) return;

    setIsGeneratingPix(true);
    setPixError(null);

    try {
      const cpfNumbers = formData.cpf.replace(/\D/g, '');
      const phoneNumbers = formData.phone.replace(/\D/g, '');
      const totalAmount = selectedNumbers.length * 100; // R$1.00 por número em centavos
      const itemName = `${selectedNumbers.length} número(s) da Super Rifa`;
      const utmQuery = getUtmQuery();

      const response = await gerarPix(
        formData.name,
        formData.email,
        cpfNumbers,
        phoneNumbers,
        totalAmount,
        itemName,
        utmQuery
      );

      setPixData(response);
      setShowPixModal(true);
      setCurrentStep(3);
      
      // Start checking payment status
      setIsCheckingPayment(true);
      checkPaymentStatus(response.id);
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setPixError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 60; // 5 minutos (5 segundos * 60)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        console.log(`Tentativa ${attempts + 1}: Status do pagamento:`, status);
        
        setPaymentStatus(status);
        
        if (status === 'APPROVED') {
          setIsCheckingPayment(false);
          setShowPixModal(false);
          return;
        }
        
        if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          setIsCheckingPayment(false);
          console.log('Timeout: Parou de verificar o status do pagamento');
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          setIsCheckingPayment(false);
        }
      }
    };

    checkStatus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  // Show PaymentSuccessScreen when payment is approved
  if (paymentStatus === 'APPROVED') {
    return <PaymentSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-4 text-center">
        <h1 className="text-2xl font-black text-green-900">🎯 SUPER RIFA 🎯</h1>
        <p className="text-green-800 font-semibold">SW4 0KM + MOTO BMW • Apenas R$1,00 por número!</p>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <img 
          src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg" 
          alt="SW4 e BMW" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h2 className="text-xl font-bold mb-2">🏆 PRÊMIOS INCRÍVEIS</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              <span>SW4 0KM</span>
            </div>
            <div className="flex items-center gap-1">
              <Bike className="w-4 h-4" />
              <span>BMW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white/10 p-4">
        <div className="flex justify-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep >= step
                  ? 'bg-yellow-400 text-green-900'
                  : 'bg-white/20 text-white/60'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Step 1: Form */}
        {currentStep === 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Seus Dados
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-yellow-400 outline-none"
              />
              
              <input
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-yellow-400 outline-none"
              />
              
              <input
                type="text"
                placeholder="CPF"
                value={formData.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                maxLength={14}
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-yellow-400 outline-none"
              />
              
              <input
                type="text"
                placeholder="Telefone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                maxLength={15}
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-yellow-400 outline-none"
              />
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!formData.name || !formData.email || !formData.cpf || !formData.phone}
              className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-300 hover:to-yellow-400 transition-all"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Number Selection */}
        {currentStep === 2 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Escolha seus Números
            </h3>

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[10, 25, 50, 100].map((count) => (
                <button
                  key={count}
                  onClick={() => selectRandomNumbers(count)}
                  className="bg-yellow-400 text-green-900 font-bold py-2 px-3 rounded-lg text-sm hover:bg-yellow-300 transition-colors"
                >
                  +{count}
                </button>
              ))}
            </div>

            {/* Selected Numbers Display */}
            {selectedNumbers.length > 0 && (
              <div className="mb-4 p-3 bg-green-500/20 rounded-lg border border-green-400">
                <p className="text-green-400 font-semibold mb-2">
                  {selectedNumbers.length} números selecionados • Total: R$ {selectedNumbers.length.toFixed(2)}
                </p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {selectedNumbers.sort((a, b) => a - b).map((number) => (
                    <span
                      key={number}
                      onClick={() => toggleNumber(number)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs font-mono cursor-pointer hover:bg-green-600"
                    >
                      {number.toString().padStart(5, '0')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Number Grid */}
            <div className="grid grid-cols-5 gap-1 mb-4 max-h-48 overflow-y-auto">
              {allNumbers.slice(0, 100).map((number) => (
                <button
                  key={number}
                  onClick={() => toggleNumber(number)}
                  className={`p-2 rounded text-xs font-mono transition-colors ${
                    selectedNumbers.includes(number)
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {number.toString().padStart(5, '0')}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-gray-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-700 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleGeneratePix}
                disabled={selectedNumbers.length === 0 || isGeneratingPix}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-300 hover:to-yellow-400 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingPix ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  'Gerar PIX'
                )}
              </button>
            </div>

            {pixError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-500 rounded-lg">
                <p className="text-red-800 text-sm">{pixError}</p>
              </div>
            )}
          </div>
        )}

        {/* PIX Modal */}
        {showPixModal && pixData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Pagamento PIX
                </h3>
                <button
                  onClick={() => setShowPixModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Payment Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${getStatusColor(paymentStatus)}`}>
                    {getStatusText(paymentStatus)}
                  </span>
                </div>
                {isCheckingPayment && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Verificando pagamento...</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="text-center mb-4">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="mx-auto mb-2 border-2 border-gray-200 rounded-lg"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
                <p className="text-sm text-gray-600">
                  Escaneie o QR Code com seu app do banco
                </p>
              </div>

              {/* PIX Code */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou copie o código PIX:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.pixCode}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(pixData.pixCode)}
                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Detalhes do Pagamento:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Números:</span>
                    <span>{selectedNumbers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor por número:</span>
                    <span>R$ 1,00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-800 border-t pt-1">
                    <span>Total:</span>
                    <span>R$ {selectedNumbers.length.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-semibold text-yellow-800 mb-2">⏰ Instruções:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Abra seu app do banco</li>
                  <li>• Escaneie o QR Code ou cole o código PIX</li>
                  <li>• Confirme o pagamento</li>
                  <li>• Aguarde a confirmação automática</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 text-center">🔒 Sorteio Seguro e Transparente</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-green-500/20 rounded-lg p-3 border border-green-400">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-100 text-sm font-semibold">Auditado pela LOTEP</p>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500">
              <Clock className="w-6 h-6 text-blue-100 mx-auto mb-2" />
              <p className="text-blue-100 text-sm font-semibold">Sorteio em 30 dias</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/80 text-xs space-y-2 pb-24">
          <p>🎯 Participe com responsabilidade • Proibido para menores de 18 anos</p>
          <p>📱 Dúvidas? Entre em contato pelo WhatsApp</p>
        </div>
      </div>
    </div>
  );
}

export default App;