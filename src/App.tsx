import React, { useState, useEffect } from 'react';
import { Check, Copy, QrCode, Clock, AlertCircle, Car, Bike, Trophy, Star, Users, Shield, Zap, Gift } from 'lucide-react';
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
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  const PRICE_PER_NUMBER = 100; // R$ 1,00 em centavos
  const totalAmount = selectedNumbers.length * PRICE_PER_NUMBER;

  // Verificação de status do pagamento
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (pixData && paymentStatus === 'PENDING') {
      intervalId = setInterval(async () => {
        try {
          const status = await verificarStatusPagamento(pixData.id);
          console.log('Status verificado:', status);
          setPaymentStatus(status);
          
          if (status === 'APPROVED') {
            setShowSuccessScreen(true);
            clearInterval(intervalId);
          } else if (status === 'CANCELLED' || status === 'EXPIRED') {
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000); // Verifica a cada 5 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pixData, paymentStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      
      // Validar CPF em tempo real
      const cleanedCpf = cleanCpf(formattedCpf);
      if (cleanedCpf.length === 11) {
        validateCpf(cleanedCpf).then(result => {
          if (!result.valid) {
            setCpfError(result.message || 'CPF inválido');
          } else {
            setCpfError(null);
          }
        });
      } else {
        setCpfError(null);
      }
    } else if (name === 'phone') {
      // Formatar telefone
      const phoneNumbers = value.replace(/\D/g, '');
      let formattedPhone = phoneNumbers;
      
      if (phoneNumbers.length <= 10) {
        formattedPhone = phoneNumbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        formattedPhone = phoneNumbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleNumber = (number: number) => {
    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const selectRandomNumbers = (count: number) => {
    const availableNumbers = Array.from({ length: 1000 }, (_, i) => i + 1)
      .filter(n => !selectedNumbers.includes(n));
    
    const randomNumbers = [];
    for (let i = 0; i < count && availableNumbers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      randomNumbers.push(availableNumbers[randomIndex]);
      availableNumbers.splice(randomIndex, 1);
    }
    
    setSelectedNumbers(prev => [...prev, ...randomNumbers]);
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

    setLoading(true);
    setError(null);

    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      
      // Validar CPF antes de enviar
      const cpfValidation = await validateCpf(cleanedCpf);
      if (!cpfValidation.valid) {
        throw new Error(cpfValidation.message || 'CPF inválido');
      }

      // Capturar UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();

      const response = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        totalAmount,
        `Rifa Super - ${selectedNumbers.length} número(s)`,
        utmQuery // Passar UTM query como último parâmetro
      );

      setPixData(response);
      setPaymentStatus('PENDING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX');
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
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
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
              <QrCode className="w-12 h-12 text-white mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white mb-2">PIX Gerado!</h1>
              <p className="text-green-100">Escaneie o QR Code ou copie o código</p>
            </div>

            {/* Status */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-center space-x-2">
                {paymentStatus === 'PENDING' && (
                  <>
                    <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
                    <span className="text-yellow-700 font-medium">Aguardando pagamento...</span>
                  </>
                )}
                {paymentStatus === 'APPROVED' && (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium">Pagamento aprovado!</span>
                  </>
                )}
                {paymentStatus === 'CANCELLED' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-medium">Pagamento cancelado</span>
                  </>
                )}
                {paymentStatus === 'EXPIRED' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 font-medium">PIX expirado</span>
                  </>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="p-6 text-center">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block mb-4">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-1">Valor a pagar</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Código PIX (Copia e Cola)</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border font-mono break-all">
                      {pixData.pixCode}
                    </code>
                    <button
                      onClick={copyPixCode}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Abra o app do seu banco</p>
                  <p>• Escolha a opção PIX</p>
                  <p>• Escaneie o QR Code ou cole o código</p>
                  <p>• Confirme o pagamento</p>
                </div>
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
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-yellow-300 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-4 pb-24">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h1 className="text-3xl font-black text-white">SUPER RIFA</h1>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-2 rounded-full inline-block font-bold text-sm mb-2">
              🎯 APENAS R$ 1,00 POR NÚMERO
            </div>
          </div>

          {/* Prêmios */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
            <h2 className="text-xl font-bold text-white text-center mb-4">🏆 PRÊMIOS INCRÍVEIS</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3 rounded-xl text-center">
                <Car className="w-8 h-8 text-amber-800 mx-auto mb-2" />
                <p className="font-bold text-amber-900 text-sm">SW4 0KM</p>
                <p className="text-xs text-amber-800">Hilux SW4</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl text-center">
                <Bike className="w-8 h-8 text-blue-100 mx-auto mb-2" />
                <p className="font-bold text-blue-100 text-sm">BMW</p>
                <p className="text-xs text-blue-200">Moto BMW</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/20 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs text-white font-medium">Auditado</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-white font-medium">Confiável</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xs text-white font-medium">Rápido</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-xs text-white font-medium">Prêmios</p>
              </div>
            </div>
          </div>

          {/* Seleção de Números */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              Escolha seus números da sorte
            </h3>
            
            {/* Botões de seleção rápida */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[5, 10, 25, 50, 100].map(count => (
                <button
                  key={count}
                  onClick={() => selectRandomNumbers(count)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                >
                  +{count}
                </button>
              ))}
            </div>

            {/* Grid de números */}
            <div className="grid grid-cols-10 gap-1 mb-4 max-h-48 overflow-y-auto">
              {Array.from({ length: 100 }, (_, i) => i + 1).map(number => (
                <button
                  key={number}
                  onClick={() => toggleNumber(number)}
                  className={`w-8 h-8 text-xs font-bold rounded transition-all duration-200 ${
                    selectedNumbers.includes(number)
                      ? 'bg-green-500 text-white ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {number.toString().padStart(3, '0')}
                </button>
              ))}
            </div>

            {selectedNumbers.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-800 font-medium text-sm mb-2">
                  Números selecionados ({selectedNumbers.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedNumbers.sort((a, b) => a - b).map(number => (
                    <span
                      key={number}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold"
                    >
                      {number.toString().padStart(3, '0')}
                    </span>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-green-800 font-bold">
                    Total: {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              Seus dados para participar
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
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
                  className={`w-full p-3 border rounded-lg outline-none transition-colors ${
                    cpfError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  required
                />
                {cpfError && (
                  <p className="text-red-500 text-sm mt-1">{cpfError}</p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  name="phone"
                  placeholder="Telefone/WhatsApp"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || selectedNumbers.length === 0 || !!cpfError}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gerando PIX...</span>
                  </div>
                ) : (
                  `Gerar PIX - ${formatCurrency(totalAmount)}`
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-2">
            <p className="text-white/80 text-sm">
              🔒 Pagamento 100% seguro via PIX
            </p>
            <p className="text-white/60 text-xs">
              Sorteio auditado e transparente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;