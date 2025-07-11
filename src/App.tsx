import React, { useState, useEffect } from 'react';
import { Check, Copy, Clock, AlertCircle, Car, Bike, Trophy, Star, Users, Shield, Zap, Gift } from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

// Função para capturar UTMs do sessionStorage
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
        // Você pode adicionar outros parâmetros UTM aqui se eles forem relevantes
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

function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pixData, setPixData] = useState<{
    pixQrCode: string;
    pixCode: string;
    paymentId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'cancelled' | 'expired'>('pending');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [cpfError, setCpfError] = useState('');

  // Polling para verificar status do pagamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (pixData && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const status = await verificarStatusPagamento(pixData.paymentId);
          setPaymentStatus(status as any);
          
          if (status === 'APPROVED') {
            setShowSuccessScreen(true);
            clearInterval(interval);
          } else if (status === 'CANCELLED' || status === 'EXPIRED') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000); // Verifica a cada 5 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [pixData, paymentStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      
      // Validar CPF em tempo real
      if (formattedCpf.length === 14) { // CPF formatado tem 14 caracteres
        const cleanedCpf = cleanCpf(formattedCpf);
        validateCpf(cleanedCpf).then(result => {
          if (!result.valid) {
            setCpfError(result.message || 'CPF inválido');
          } else {
            setCpfError('');
          }
        });
      } else {
        setCpfError('');
      }
    } else if (name === 'phone') {
      // Formatar telefone
      const numbers = value.replace(/\D/g, '');
      let formatted = numbers;
      
      if (numbers.length <= 2) {
        formatted = numbers;
      } else if (numbers.length <= 7) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      } else if (numbers.length <= 11) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      } else {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      }
      
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

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
    const availableNumbers = Array.from({ length: 10000 }, (_, i) => i + 1)
      .filter(n => !selectedNumbers.includes(n));
    
    const randomNumbers = [];
    for (let i = 0; i < count && availableNumbers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      randomNumbers.push(availableNumbers[randomIndex]);
      availableNumbers.splice(randomIndex, 1);
    }
    
    setSelectedNumbers(prev => [...prev, ...randomNumbers].sort((a, b) => a - b));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedNumbers.length === 0) {
      setError('Selecione pelo menos um número');
      return;
    }

    if (cpfError) {
      setError('Por favor, corrija o CPF antes de continuar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Capturar UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();
      
      const cleanedCpf = cleanCpf(formData.cpf);
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const totalAmount = selectedNumbers.length * 100; // R$ 1,00 por número em centavos
      
      const response = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        totalAmount,
        `Super Rifa - ${selectedNumbers.length} número(s)`,
        utmQuery // Passar UTMs capturadas
      );

      setPixData({
        pixQrCode: response.pixQrCode,
        pixCode: response.pixCode,
        paymentId: response.id
      });
      
      setPaymentStatus('pending');
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100);
  };

  if (showSuccessScreen) {
    return <PaymentSuccessScreen />;
  }

  if (pixData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">PIX Gerado!</h1>
              <p className="text-green-100">
                Escaneie o QR Code ou copie o código PIX
              </p>
            </div>

            {/* Status */}
            <div className="p-4">
              <div className={`flex items-center justify-center p-3 rounded-lg mb-4 ${
                paymentStatus === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
                paymentStatus === 'approved' ? 'bg-green-50 border border-green-200' :
                'bg-red-50 border border-red-200'
              }`}>
                {paymentStatus === 'pending' && (
                  <>
                    <Clock className="w-5 h-5 text-yellow-600 mr-2 animate-spin" />
                    <span className="text-yellow-800 font-medium">Aguardando pagamento...</span>
                  </>
                )}
                {paymentStatus === 'approved' && (
                  <>
                    <Check className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Pagamento aprovado!</span>
                  </>
                )}
                {(paymentStatus === 'cancelled' || paymentStatus === 'expired') && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-red-800 font-medium">
                      {paymentStatus === 'cancelled' ? 'Pagamento cancelado' : 'Pagamento expirado'}
                    </span>
                  </>
                )}
              </div>

              {/* QR Code */}
              <div className="text-center mb-6">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                  <img 
                    src={pixData.pixQrCode} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              </div>

              {/* PIX Code */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Código PIX (Copia e Cola):
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
                      copied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Valor */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Números selecionados:</span>
                  <span className="font-bold">{selectedNumbers.length}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Valor total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatPrice(selectedNumbers.length * 100)}
                  </span>
                </div>
              </div>

              {/* Instruções */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Como pagar:</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escolha a opção PIX</li>
                  <li>3. Escaneie o QR Code ou cole o código</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-20 w-48 h-48 bg-green-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-1/3 w-40 h-40 bg-yellow-300 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-4 pb-24">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 rounded-2xl shadow-xl">
              <Trophy className="w-12 h-12 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 leading-tight">
            SUPER RIFA
          </h1>
          <p className="text-white/80 text-lg font-medium">
            Concorra a SW4 0KM + Moto BMW
          </p>
          <div className="flex items-center justify-center mt-3 space-x-4">
            <div className="flex items-center text-yellow-300">
              <Star className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Sorteio Oficial</span>
            </div>
            <div className="flex items-center text-green-300">
              <Shield className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">100% Seguro</span>
            </div>
          </div>
        </div>

        {/* Prêmios */}
        <div className="max-w-md mx-auto mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-center mb-3">
                <Car className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-white font-bold text-center text-sm">SW4 0KM</h3>
              <p className="text-white/70 text-xs text-center mt-1">Hilux SW4 2024</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-center mb-3">
                <Bike className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-center text-sm">Moto BMW</h3>
              <p className="text-white/70 text-xs text-center mt-1">BMW G 310 GS</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-400">R$ 1</div>
                <div className="text-white/70 text-xs">por número</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">10.000</div>
                <div className="text-white/70 text-xs">números</div>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400 mr-1" />
                  <span className="text-2xl font-bold text-blue-400">2.847</span>
                </div>
                <div className="text-white/70 text-xs">participantes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
              <h2 className="text-xl font-bold text-white">Participe Agora!</h2>
              <p className="text-green-100 text-sm mt-1">Preencha seus dados e escolha seus números</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  required
                  maxLength={14}
                  className={`w-full p-3 border rounded-lg outline-none transition-colors ${
                    cpfError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="000.000.000-00"
                />
                {cpfError && (
                  <p className="text-red-600 text-xs mt-1">{cpfError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  maxLength={15}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Seleção de números */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Escolha seus números da sorte
                </label>
                
                {/* Botões de seleção rápida */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => selectRandomNumbers(5)}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-800 font-bold py-2 px-3 rounded-lg text-xs transition-all duration-200 hover:scale-105"
                  >
                    +5 números
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRandomNumbers(10)}
                    className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-green-800 font-bold py-2 px-3 rounded-lg text-xs transition-all duration-200 hover:scale-105"
                  >
                    +10 números
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRandomNumbers(25)}
                    className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-blue-800 font-bold py-2 px-3 rounded-lg text-xs transition-all duration-200 hover:scale-105"
                  >
                    +25 números
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRandomNumbers(50)}
                    className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-red-800 font-bold py-2 px-3 rounded-lg text-xs transition-all duration-200 hover:scale-105"
                  >
                    +50 números
                  </button>
                </div>

                {/* Grid de números */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(number => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => toggleNumber(number)}
                        className={`w-10 h-10 text-xs font-medium rounded transition-all duration-200 ${
                          selectedNumbers.includes(number)
                            ? 'bg-green-500 text-white ring-2 ring-green-300'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-300'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedNumbers.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium text-sm">
                        {selectedNumbers.length} número(s) selecionado(s)
                      </span>
                      <span className="text-green-800 font-bold">
                        {formatPrice(selectedNumbers.length * 100)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNumbers([])}
                      className="text-red-600 text-xs mt-2 hover:text-red-700"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || selectedNumbers.length === 0 || !!cpfError}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Gerando PIX...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Gift className="w-5 h-5 mr-2" />
                    Gerar PIX - {formatPrice(selectedNumbers.length * 100)}
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white/70 text-xs mb-2">
              🔒 Pagamento 100% seguro via PIX
            </p>
            <p className="text-white/70 text-xs">
              Sorteio realizado pela LOTEP - Loteria do Estado do Piauí
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;