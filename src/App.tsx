import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Trophy, 
  Shield, 
  Clock, 
  Users, 
  CheckCircle, 
  X, 
  Copy, 
  QrCode,
  Loader2,
  Gift,
  MessageCircle
} from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { PixResponse } from './types';

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

function App() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
  }, [paymentCheckInterval]);

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

  const validateForm = (): boolean => {
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    const phoneNumbers = formData.phone.replace(/\D/g, '');
    
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Email válido é obrigatório');
      return false;
    }
    
    if (cpfNumbers.length !== 11) {
      setError('CPF deve ter 11 dígitos');
      return false;
    }
    
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      setError('Telefone deve ter 10 ou 11 dígitos');
      return false;
    }
    
    return true;
  };

  const handleNumberSelect = (number: number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else {
        return [...prev, number].sort((a, b) => a - b);
      }
    });
  };

  const handleContinue = () => {
    if (selectedNumbers.length === 0) {
      setError('Selecione pelo menos um número');
      return;
    }
    setError(null);
    setShowForm(true);
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    setIsCheckingPayment(true);
    
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        console.log('Status atual do pagamento:', status);
        
        if (status === 'APPROVED') {
          // Clear interval
          if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
            setPaymentCheckInterval(null);
          }
          
          setIsCheckingPayment(false);
          setShowPixModal(false);
          setShowSuccessModal(true);
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          // Clear interval
          if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
            setPaymentCheckInterval(null);
          }
          
          setIsCheckingPayment(false);
          setError('Pagamento cancelado ou expirado. Tente novamente.');
        }
        // Continue checking if status is still PENDING
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        // Continue checking even on error
      }
    };

    // Check immediately
    checkStatus();
    
    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    setPaymentCheckInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsGeneratingPix(true);
    setError(null);

    try {
      const totalAmount = selectedNumbers.length * 100; // R$ 1,00 por número em centavos
      const itemName = `Super Rifa - ${selectedNumbers.length} número${selectedNumbers.length > 1 ? 's' : ''}`;
      
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmQuery = urlParams.toString();
      
      const response = await gerarPix(
        formData.name,
        formData.email,
        formData.cpf.replace(/\D/g, ''),
        formData.phone.replace(/\D/g, ''),
        totalAmount,
        itemName,
        utmQuery
      );

      setPixData(response);
      setShowForm(false);
      setShowPixModal(true);
      
      // Start checking payment status
      startPaymentStatusCheck(response.id);
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setError(error instanceof Error ? error.message : 'Erro ao gerar PIX');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // Reset form and selections
    setSelectedNumbers([]);
    setFormData({
      name: '',
      email: '',
      cpf: '',
      phone: ''
    });
    setPixData(null);
  };

  const openWhatsApp = () => {
    const phoneNumber = '5563992141134'; // Número formatado para WhatsApp
    const message = encodeURIComponent('Olá! Sou o milésimo comprador da Super Rifa e gostaria de receber meu prêmio exclusivo!');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderNumbers = () => {
    const numbers = [];
    for (let i = 1; i <= 1000; i++) {
      const isSelected = selectedNumbers.includes(i);
      numbers.push(
        <button
          key={i}
          onClick={() => handleNumberSelect(i)}
          className={`
            w-12 h-12 rounded-lg border-2 font-semibold text-sm transition-all duration-200
            ${isSelected 
              ? 'bg-green-500 border-green-500 text-white shadow-lg transform scale-105' 
              : 'bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50'
            }
          `}
        >
          {i.toString().padStart(3, '0')}
        </button>
      );
    }
    return numbers;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-black text-green-900 leading-tight">
            🏆 SUPER RIFA 🏆
          </h1>
          <p className="text-green-800 font-semibold">
            SW4 0KM + MOTO BMW
          </p>
        </div>
      </div>

      {/* Prize Images */}
      <div className="p-4">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3 mb-6">
          <div className="relative rounded-xl overflow-hidden shadow-xl">
            <img 
              src="/sw4-car.jpg" 
              alt="SW4 0KM" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white font-bold text-sm">SW4 0KM</p>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden shadow-xl">
            <img 
              src="/pexels-photo-170811.jpg" 
              alt="Moto BMW" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white font-bold text-sm">Moto BMW</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="p-4">
        <div className="max-w-md mx-auto space-y-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-900" />
              </div>
              <div>
                <p className="text-white font-semibold">Apenas R$ 1,00</p>
                <p className="text-white/80 text-sm">por número</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-900" />
              </div>
              <div>
                <p className="text-white font-semibold">100% Transparente</p>
                <p className="text-white/80 text-sm">Auditado pela LOTEP</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <p className="text-white font-semibold">Sorteio em breve</p>
                <p className="text-white/80 text-sm">Data será divulgada</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Number Selection */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Escolha seus números da sorte
              </h2>
              <p className="text-gray-600 text-sm">
                Selecione quantos números quiser
              </p>
              {selectedNumbers.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 font-semibold">
                    {selectedNumbers.length} número{selectedNumbers.length > 1 ? 's' : ''} selecionado{selectedNumbers.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-green-600 text-sm">
                    Total: R$ {selectedNumbers.length},00
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-6 max-h-full overflow-y-auto">
              {renderNumbers()}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={selectedNumbers.length === 0}
              className={`
                w-full py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200
                ${selectedNumbers.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Continuar com {selectedNumbers.length} número{selectedNumbers.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Seus dados</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isGeneratingPix}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingPix ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  `Gerar PIX - R$ ${selectedNumbers.length},00`
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PIX Modal */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Pagamento PIX</h2>
              <button
                onClick={() => setShowPixModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                Escaneie o QR Code ou copie o código PIX
              </p>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-mono text-xs text-gray-700 break-all">
                  {pixData.pixCode}
                </p>
              </div>

              <button
                onClick={copyPixCode}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Copy className="w-4 h-4" />
                Copiar código PIX
              </button>

              {isCheckingPayment && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Aguardando pagamento...</span>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-semibold text-sm">
                    Importante
                  </p>
                  <p className="text-yellow-700 text-xs">
                    Após o pagamento, você receberá a confirmação automaticamente. 
                    Mantenha esta tela aberta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Gift className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                🎉 Parabéns! Você é o milésimo comprador da Super Rifa! 🎉
              </h2>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
              </p>
              
              <p className="text-gray-800 font-semibold mb-4">
                Sim, é isso mesmo…
              </p>
              
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4">
                <p className="text-gray-800 font-bold mb-2">
                  👉 Mas atenção: para receber, você precisa chamar AGORA no WhatsApp.
                </p>
                
                <p className="text-red-600 font-semibold mb-2">
                  ⏳ O prêmio só será liberado nas próximas 2 horas.
                </p>
                
                <p className="text-red-700 font-bold">
                  Se passar do tempo… perde!
                </p>
              </div>
              
              <button
                onClick={openWhatsApp}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3 mb-4"
              >
                <MessageCircle className="w-6 h-6" />
                🎁 CLIQUE AQUI para garantir seu prêmio
              </button>
              
              <p className="text-gray-600 text-sm mb-6">
                (Mas seja rápido, essa chance é única.)
              </p>
              
              <button
                onClick={closeSuccessModal}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pb-24">
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
            <p className="text-white/80 text-xs">
              Sorteio autorizado e auditado pela LOTEP
            </p>
            <p className="text-white/60 text-xs mt-1">
              Participe com responsabilidade
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;