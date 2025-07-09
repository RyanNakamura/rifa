import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Bike, 
  Trophy, 
  Users, 
  Clock, 
  Shield, 
  CheckCircle, 
  Copy, 
  QrCode,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { PixResponse } from './types';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    quantity: 1
  });

  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const pricePerNumber = 1; // R$ 1,00 por número
  const totalPrice = formData.quantity * pricePerNumber;

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatCPF(numbers) }));
      }
    } else if (name === 'phone') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatPhone(numbers) }));
      }
    } else if (name === 'quantity') {
      const quantity = Math.max(1, Math.min(100, parseInt(value) || 1));
      setFormData(prev => ({ ...prev, [name]: quantity }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { name, email, cpf, phone } = formData;
    
    if (!name.trim()) return 'Nome é obrigatório';
    if (!email.trim() || !email.includes('@')) return 'Email válido é obrigatório';
    
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) return 'CPF deve ter 11 dígitos';
    
    const phoneNumbers = phone.replace(/\D/g, '');
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) return 'Telefone inválido';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsGeneratingPix(true);
    setPixError(null);

    try {
      // Capturar parâmetros UTM da URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmQuery = urlParams.toString();

      const response = await gerarPix(
        formData.name,
        formData.email,
        formData.cpf.replace(/\D/g, ''),
        formData.phone.replace(/\D/g, ''),
        totalPrice * 100, // Converter para centavos
        `Super Rifa - ${formData.quantity} número${formData.quantity > 1 ? 's' : ''}`,
        utmQuery
      );

      setPixData(response);
      setShowPixModal(true);
      setPaymentStatus('PENDING');
      
      // Iniciar verificação de status
      startPaymentStatusCheck(response.id);
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setPixError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    setIsCheckingPayment(true);
    
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        setPaymentStatus(status);
        
        if (status === 'APPROVED') {
          setIsCheckingPayment(false);
          setShowPixModal(false);
          setShowSuccessScreen(true);
          return;
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
          return;
        }
        
        // Continuar verificando se ainda está pendente
        if (status === 'PENDING') {
          setTimeout(checkStatus, 3000); // Verificar a cada 3 segundos
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setTimeout(checkStatus, 5000); // Tentar novamente em 5 segundos em caso de erro
      }
    };

    checkStatus();
  };

  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      alert('Código PIX copiado!');
    }
  };

  const closePixModal = () => {
    setShowPixModal(false);
    setPixData(null);
    setIsCheckingPayment(false);
    setPaymentStatus('PENDING');
  };

  // Se deve mostrar a tela de sucesso
  if (showSuccessScreen) {
    return <PaymentSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-center py-3">
        <p className="text-green-900 font-bold text-sm">
          🔥 ÚLTIMAS HORAS! Apenas R$ 1,00 por número - Não perca essa chance!
        </p>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            SUPER RIFA
          </h1>
          <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 text-green-900 px-6 py-3 rounded-full inline-block font-bold text-xl mb-6">
            SW4 0KM + MOTO BMW
          </div>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Concorra a uma SW4 0KM + Moto BMW por apenas R$1 por número! 
            Sorteio transparente e auditado pela LOTEP.
          </p>
        </div>

        {/* Prize Images */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <img 
              src="/sw4-car.jpg" 
              alt="SW4 0KM" 
              className="w-full h-48 object-cover rounded-xl mb-4"
            />
            <div className="flex items-center text-white mb-2">
              <Car className="w-6 h-6 mr-2 text-yellow-400" />
              <h3 className="text-xl font-bold">SW4 0KM</h3>
            </div>
            <p className="text-white/80">Toyota SW4 0 quilômetro, modelo mais recente</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <img 
              src="/pexels-photo-170811.jpg" 
              alt="Moto BMW" 
              className="w-full h-48 object-cover rounded-xl mb-4"
            />
            <div className="flex items-center text-white mb-2">
              <Bike className="w-6 h-6 mr-2 text-yellow-400" />
              <h3 className="text-xl font-bold">Moto BMW</h3>
            </div>
            <p className="text-white/80">BMW premium, alta cilindrada</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">2</div>
            <div className="text-white/80 text-sm">Prêmios</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">847</div>
            <div className="text-white/80 text-sm">Participantes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">72h</div>
            <div className="text-white/80 text-sm">Restantes</div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Participe Agora!
            </h2>
            <p className="text-gray-600">Preencha seus dados e concorra</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF
              </label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Números
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                required
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total a pagar:</span>
                <span className="text-2xl font-bold text-green-600">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGeneratingPix}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPix ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Gerando PIX...
                </div>
              ) : (
                'Gerar PIX e Participar'
              )}
            </button>

            {pixError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm">{pixError}</span>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 flex items-center justify-center text-gray-500">
            <Shield className="w-4 h-4 mr-1" />
            <span className="text-xs">Pagamento 100% seguro</span>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 text-center">
          <div className="flex justify-center items-center space-x-6 text-white/60">
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm">Sorteio Auditado</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">LOTEP Oficial</span>
            </div>
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              <span className="text-sm">+800 Participantes</span>
            </div>
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Pagamento PIX</h3>
                <button
                  onClick={closePixModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {paymentStatus === 'APPROVED' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-green-600 mb-2">
                    Pagamento Confirmado!
                  </h4>
                  <p className="text-gray-600">
                    Seu pagamento foi processado com sucesso. Boa sorte no sorteio!
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="bg-blue-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      Escaneie o QR Code
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Use o app do seu banco para escanear o código PIX
                    </p>
                  </div>

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
                    <img 
                      src={pixData.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-full max-w-64 mx-auto"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código PIX (Copia e Cola)
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={pixData.pixCode}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={copyPixCode}
                          className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Valor:</strong> R$ {totalPrice.toFixed(2)}
                      </p>
                    </div>

                    {isCheckingPayment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm">Aguardando confirmação do pagamento...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;