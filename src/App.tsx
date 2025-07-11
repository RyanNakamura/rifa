import React, { useState, useEffect } from 'react';
import { Check, Copy, Clock, AlertCircle, Car, Bike, Trophy, Users, Shield, Star } from 'lucide-react';
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

        const params = [];
        if (clickId) {
          params.push(`click_id=${encodeURIComponent(clickId)}`);
        }
        if (utmSource) {
          params.push(`utm_source=${encodeURIComponent(utmSource)}`);
        }

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

function App() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');

  // Números disponíveis (1 a 100000)
  const totalNumbers = 100000;
  const pricePerNumber = 1; // R$ 1,00 por número

  // Função para gerar números aleatórios
  const generateRandomNumbers = (count: number) => {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * totalNumbers) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  };

  // Função para selecionar números
  const selectNumbers = (count: number) => {
    const randomNumbers = generateRandomNumbers(count);
    setSelectedNumbers(randomNumbers);
  };

  // Função para remover número
  const removeNumber = (numberToRemove: number) => {
    setSelectedNumbers(prev => prev.filter(num => num !== numberToRemove));
  };

  // Validação de email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação de telefone
  const validatePhone = (phone: string) => {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  // Formatação de telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // Validação de nome
  const validateName = (name: string) => {
    return name.trim().length >= 2 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name);
  };

  // Função para gerar PIX
  const handleGeneratePix = async () => {
    // Validações
    let hasError = false;

    if (!validateName(name)) {
      setNameError('Nome deve ter pelo menos 2 caracteres e conter apenas letras');
      hasError = true;
    } else {
      setNameError('');
    }

    if (!validateEmail(email)) {
      setEmailError('Email inválido');
      hasError = true;
    } else {
      setEmailError('');
    }

    const cleanedCpf = cleanCpf(cpf);
    const cpfValidation = await validateCpf(cleanedCpf);
    if (!cpfValidation.valid) {
      setCpfError(cpfValidation.message || 'CPF inválido');
      hasError = true;
    } else {
      setCpfError('');
    }

    if (!validatePhone(phone)) {
      setPhoneError('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (selectedNumbers.length === 0) {
      alert('Selecione pelo menos um número');
      return;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = selectedNumbers.length * pricePerNumber * 100; // Converter para centavos
      const itemName = `Rifa Super - ${selectedNumbers.length} número(s): ${selectedNumbers.join(', ')}`;
      
      // Capturar UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();
      
      const pixResponse = await gerarPix(
        name,
        email,
        cleanedCpf,
        phone.replace(/\D/g, ''),
        totalAmount,
        itemName,
        utmQuery // Passar UTM query para a função
      );

      setPixData(pixResponse);
      
      // Iniciar verificação de status
      startStatusCheck(pixResponse.id);
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar PIX');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar status do pagamento
  const startStatusCheck = (paymentId: string) => {
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        setPaymentStatus(status);
        
        if (status === 'APPROVED') {
          setShowPaymentSuccess(true);
          return; // Para o polling
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          return; // Para o polling
        }
        
        // Continuar verificando se ainda está PENDING
        if (status === 'PENDING') {
          setTimeout(checkStatus, 5000); // Verificar a cada 5 segundos
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setTimeout(checkStatus, 10000); // Tentar novamente em 10 segundos em caso de erro
      }
    };

    checkStatus();
  };

  // Função para copiar código PIX
  const copyPixCode = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  const totalPrice = selectedNumbers.length * pricePerNumber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {showPaymentSuccess && <PaymentSuccessScreen />}
      
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <img 
          src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
          alt="Carros de luxo" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl font-black mb-2">SUPER RIFA</h1>
            <p className="text-lg font-semibold">SW4 0KM + MOTO BMW</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium">Sorteio pela LOTEP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {!pixData ? (
          <>
            {/* Prêmios */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
              <h2 className="text-white font-bold text-lg mb-3 text-center">🏆 PRÊMIOS</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3">
                  <Car className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-white font-semibold">1º Prêmio</p>
                    <p className="text-white/80 text-sm">SW4 0KM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3">
                  <Bike className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-white font-semibold">2º Prêmio</p>
                    <p className="text-white/80 text-sm">Moto BMW</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seleção de Números */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-xl">
              <h2 className="text-gray-800 font-bold text-lg mb-4 text-center">Escolha seus números</h2>
              
              {/* Botões de seleção rápida */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 5, 10, 25].map(count => (
                  <button
                    key={count}
                    onClick={() => selectNumbers(count)}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    +{count}
                  </button>
                ))}
              </div>

              {/* Números selecionados */}
              {selectedNumbers.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-700 font-medium mb-2">Números selecionados:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNumbers.map(number => (
                      <span
                        key={number}
                        onClick={() => removeNumber(number)}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
                      >
                        {number.toString().padStart(6, '0')} ×
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="text-green-600 font-bold text-lg">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedNumbers.length} número(s) × R$ {pricePerNumber.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-xl">
              <h2 className="text-gray-800 font-bold text-lg mb-4 text-center">Seus dados</h2>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:border-green-500 ${nameError ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {nameError && <p className="text-red-600 text-xs mt-1">{nameError}</p>}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:border-green-500 ${emailError ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {emailError && <p className="text-red-600 text-xs mt-1">{emailError}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="CPF"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    maxLength={14}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:border-green-500 ${cpfError ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {cpfError && <p className="text-red-600 text-xs mt-1">{cpfError}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Telefone (XX) XXXXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:border-green-500 ${phoneError ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
                </div>
              </div>

              <button
                onClick={handleGeneratePix}
                disabled={isLoading || selectedNumbers.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 px-6 rounded-xl mt-6 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Gerando PIX...
                  </div>
                ) : (
                  `Gerar PIX - R$ ${totalPrice.toFixed(2)}`
                )}
              </button>
            </div>

            {/* Garantias */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <h3 className="text-white font-bold text-center mb-3">🛡️ GARANTIAS</h3>
              <div className="space-y-2 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Sorteio auditado pela LOTEP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Transmissão ao vivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>100% transparente</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Tela de Pagamento PIX */
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pagamento PIX</h2>
              <p className="text-gray-600">Escaneie o QR Code ou copie o código</p>
            </div>

            {/* Status do Pagamento */}
            <div className="mb-6">
              {paymentStatus === 'PENDING' && (
                <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                  <Clock className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Aguardando pagamento...</span>
                </div>
              )}
              {paymentStatus === 'APPROVED' && (
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Pagamento aprovado!</span>
                </div>
              )}
              {paymentStatus === 'CANCELLED' && (
                <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Pagamento cancelado</span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <img 
                src={pixData.pixQrCode} 
                alt="QR Code PIX" 
                className="w-48 h-48 border-4 border-gray-200 rounded-xl"
              />
            </div>

            {/* Código PIX */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código PIX (Copia e Cola)
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
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    copiedPix 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {copiedPix ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Informações do Pedido */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">Resumo do Pedido</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Números selecionados:</span>
                  <span className="font-medium">{selectedNumbers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por número:</span>
                  <span className="font-medium">R$ {pricePerNumber.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 pt-2 border-t">
                  <span>Total:</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;