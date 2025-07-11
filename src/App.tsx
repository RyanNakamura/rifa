import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Bike, 
  Trophy, 
  Users, 
  Clock, 
  Shield, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  QrCode,
  X,
  Loader2
} from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import { PixResponse } from './types';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

function App() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Função para obter UTMs do sessionStorage e localStorage
  const getUtmParams = () => {
    let utmQuery = '';
    
    try {
      // Pegar dados do sessionStorage (PREVIOUS_PAGE_VIEW)
      const sessionDataRaw = sessionStorage.getItem('PREVIOUS_PAGE_VIEW');
      if (sessionDataRaw) {
        const sessionArray = JSON.parse(sessionDataRaw);
        if (Array.isArray(sessionArray) && sessionArray.length > 0) {
          const sessionObject = JSON.parse(sessionArray[0]);
          
          const clickId = sessionObject.click_id;
          const utmSource = sessionObject.utm_source;
          
          const params = [];
          if (clickId) {
            params.push(`click_id=${encodeURIComponent(clickId)}`);
          }
          if (utmSource) {
            params.push(`utm_source=${encodeURIComponent(utmSource)}`);
          }
          
          utmQuery = params.join('&');
          
          console.log('Dados do sessionStorage (PREVIOUS_PAGE_VIEW):', sessionDataRaw);
          console.log('Objeto parseado:', sessionObject);
          console.log('UTM Query construída:', utmQuery);
        }
      }
      
      // Se não conseguiu do sessionStorage, tenta do localStorage
      if (!utmQuery) {
        const localStorageKey = 'KWAI_UTM_TRACK_07c0b4b9-312a-4bbd-bd76-b227ffdc6f1d';
        const localDataRaw = localStorage.getItem(localStorageKey);
        if (localDataRaw) {
          utmQuery = `utm_source=${encodeURIComponent(localDataRaw)}`;
          console.log('Dados do localStorage:', localDataRaw);
          console.log('UTM Query do localStorage:', utmQuery);
        }
      }
    } catch (error) {
      console.error('Erro ao obter UTMs:', error);
    }
    
    return utmQuery;
  };

  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  const toggleNumber = (num: number) => {
    setSelectedNumbers(prev => 
      prev.includes(num) 
        ? prev.filter(n => n !== num)
        : [...prev, num]
    );
  };

  const selectRandomNumbers = (count: number) => {
    const availableNumbers = numbers.filter(num => !selectedNumbers.includes(num));
    const randomSelection = [];
    
    for (let i = 0; i < count && availableNumbers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNum = availableNumbers.splice(randomIndex, 1)[0];
      randomSelection.push(selectedNum);
    }
    
    setSelectedNumbers(prev => [...prev, ...randomSelection].sort((a, b) => a - b));
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    const cleanedCpf = cleanCpf(formData.cpf);
    if (!cleanedCpf) {
      errors.cpf = 'CPF é obrigatório';
    } else {
      const cpfValidation = validateCpf(cleanedCpf);
      if (!cpfValidation.valid) {
        errors.cpf = cpfValidation.message || 'CPF inválido';
      }
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.phone)) {
      errors.phone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cpf') {
      value = formatCpf(value);
    } else if (field === 'phone') {
      value = value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGeneratePix = async () => {
    if (!validateForm()) return;
    
    setIsGeneratingPix(true);
    
    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const amountCentavos = selectedNumbers.length * 100;
      const itemName = `Super Rifa - ${selectedNumbers.length} número${selectedNumbers.length > 1 ? 's' : ''}`;
      
      // Obter UTMs do sessionStorage/localStorage
      const utmQuery = getUtmParams();
      
      console.log('Gerando PIX com UTM Query:', utmQuery);
      
      const pixResponse = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        amountCentavos,
        itemName,
        utmQuery
      );
      
      setPixData(pixResponse);
      setShowPixModal(true);
      setPaymentStatus('PENDING');
      
      // Iniciar verificação de status
      startPaymentStatusCheck(pixResponse.id);
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar PIX');
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
          setShowPaymentSuccess(true);
          return;
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
          return;
        }
        
        // Continue checking if still pending
        if (status === 'PENDING') {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setTimeout(checkStatus, 10000); // Retry after 10 seconds on error
      }
    };
    
    // Start checking after 3 seconds
    setTimeout(checkStatus, 3000);
  };

  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      alert('Código PIX copiado!');
    }
  };

  const closePixModal = () => {
    setShowPixModal(false);
    setIsCheckingPayment(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const totalPrice = selectedNumbers.length * 1;

  if (showPaymentSuccess) {
    return <PaymentSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <img 
          src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg" 
          alt="Carros de luxo" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl font-black mb-2">SUPER RIFA</h1>
            <div className="flex items-center justify-center gap-2 text-yellow-300">
              <Trophy className="w-6 h-6" />
              <span className="text-lg font-bold">SW4 0KM + MOTO BMW</span>
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Prêmios */}
      <div className="bg-white/10 backdrop-blur-sm border-y border-white/20 py-6">
        <div className="max-w-md mx-auto px-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="bg-white/20 rounded-xl p-4 mb-2">
                <Car className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-white font-bold text-sm">1º PRÊMIO</h3>
                <p className="text-yellow-300 font-semibold text-xs">SW4 0KM</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-xl p-4 mb-2">
                <Bike className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-white font-bold text-sm">2º PRÊMIO</h3>
                <p className="text-yellow-300 font-semibold text-xs">MOTO BMW</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informações importantes */}
      <div className="bg-yellow-400 py-3">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-gray-800">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-sm">Sorteio: 15 de Janeiro de 2025</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="bg-white/10 backdrop-blur-sm py-4">
        <div className="max-w-md mx-auto px-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-yellow-300 font-bold text-lg">100</div>
              <div className="text-white/80 text-xs">Números</div>
            </div>
            <div>
              <div className="text-yellow-300 font-bold text-lg">R$ 1</div>
              <div className="text-white/80 text-xs">Por número</div>
            </div>
            <div>
              <div className="text-green-400 font-bold text-lg">87</div>
              <div className="text-white/80 text-xs">Vendidos</div>
            </div>
            <div>
              <div className="text-red-100 font-bold text-lg">13</div>
              <div className="text-white/80 text-xs">Restantes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seleção de números */}
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <h2 className="text-white font-bold text-lg mb-3 text-center">Escolha seus números</h2>
          
          {/* Botões de seleção rápida */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => selectRandomNumbers(5)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              +5 Aleatórios
            </button>
            <button
              onClick={() => selectRandomNumbers(10)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              +10 Aleatórios
            </button>
            <button
              onClick={clearSelection}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Limpar
            </button>
          </div>

          {/* Grid de números */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {numbers.map(num => {
              const isSelected = selectedNumbers.includes(num);
              const isSold = Math.random() < 0.87; // 87% vendidos
              
              return (
                <button
                  key={num}
                  onClick={() => !isSold && toggleNumber(num)}
                  disabled={isSold}
                  className={`
                    aspect-square rounded-lg font-bold text-sm transition-all duration-200
                    ${isSold 
                      ? 'bg-red-500 text-white cursor-not-allowed opacity-50' 
                      : isSelected
                        ? 'bg-yellow-400 text-gray-800 ring-4 ring-yellow-300 scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                    }
                  `}
                >
                  {num.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Resumo da seleção */}
          {selectedNumbers.length > 0 && (
            <div className="bg-white/20 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Números selecionados:</span>
                <span className="text-yellow-300 font-bold">{selectedNumbers.length}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedNumbers.map(num => (
                  <span key={num} className="bg-yellow-400 text-gray-800 px-2 py-1 rounded text-xs font-bold">
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Total:</span>
                <span className="text-green-400 font-bold text-lg">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Botão de continuar */}
          {selectedNumbers.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all duration-300 transform hover:scale-105"
            >
              Continuar com {selectedNumbers.length} número{selectedNumbers.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <h3 className="text-white font-bold text-lg mb-4 text-center">Seus dados</h3>
            
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border-2 transition-colors ${
                    formErrors.name ? 'border-red-500' : 'border-white/30 focus:border-yellow-400'
                  }`}
                />
                {formErrors.name && <p className="text-red-100 text-sm mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border-2 transition-colors ${
                    formErrors.email ? 'border-red-500' : 'border-white/30 focus:border-yellow-400'
                  }`}
                />
                {formErrors.email && <p className="text-red-100 text-sm mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="CPF"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  maxLength={14}
                  className={`w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border-2 transition-colors ${
                    formErrors.cpf ? 'border-red-500' : 'border-white/30 focus:border-yellow-400'
                  }`}
                />
                {formErrors.cpf && <p className="text-red-100 text-sm mt-1">{formErrors.cpf}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Telefone (XX) XXXXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  maxLength={15}
                  className={`w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border-2 transition-colors ${
                    formErrors.phone ? 'border-red-500' : 'border-white/30 focus:border-yellow-400'
                  }`}
                />
                {formErrors.phone && <p className="text-red-100 text-sm mt-1">{formErrors.phone}</p>}
              </div>
            </div>

            <button
              onClick={handleGeneratePix}
              disabled={isGeneratingPix}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-gray-800 font-bold py-3 px-6 rounded-xl text-lg mt-4 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPix ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando PIX...
                </div>
              ) : (
                `Gerar PIX - ${formatPrice(totalPrice)}`
              )}
            </button>
          </div>
        )}

        {/* Garantias */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <h3 className="text-white font-bold text-lg mb-3 text-center">Garantias</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-white text-sm">Sorteio auditado pela LOTEP</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-white text-sm">Pagamento 100% seguro</span>
            </div>
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <span className="text-white text-sm">Prêmios garantidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal do PIX */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pagamento PIX</h2>
              <button
                onClick={closePixModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto mb-3"
                />
                <p className="text-gray-600 text-sm mb-2">Escaneie o QR Code ou copie o código PIX</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Código PIX:</p>
                <p className="font-mono text-xs text-gray-800 break-all mb-2">{pixData.pixCode}</p>
                <button
                  onClick={copyPixCode}
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copiar código PIX
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCheckingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                      <span className="text-yellow-800 font-semibold text-sm">Aguardando pagamento...</span>
                    </>
                  ) : paymentStatus === 'APPROVED' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-semibold text-sm">Pagamento aprovado!</span>
                    </>
                  ) : paymentStatus === 'CANCELLED' ? (
                    <>
                      <X className="w-5 h-5 text-red-600" />
                      <span className="text-red-800 font-semibold text-sm">Pagamento cancelado</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-800 font-semibold text-sm">Aguardando pagamento</span>
                    </>
                  )}
                </div>
                <p className="text-yellow-700 text-xs">
                  {isCheckingPayment 
                    ? 'Verificando status automaticamente...' 
                    : 'Após o pagamento, você receberá a confirmação automaticamente.'
                  }
                </p>
              </div>

              <div className="text-left space-y-2 text-sm text-gray-600">
                <p><strong>Valor:</strong> {formatPrice(selectedNumbers.length)}</p>
                <p><strong>Números:</strong> {selectedNumbers.join(', ')}</p>
                <p><strong>Nome:</strong> {formData.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;