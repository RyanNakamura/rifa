import React, { useState, useEffect } from 'react';
import { Check, Copy, Clock, AlertCircle, Car, Bike, Gift, Star, Users, Trophy, Shield, Zap } from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface PixData {
  pixQrCode: string;
  pixCode: string;
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
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  // Função para extrair UTMs do sessionStorage
  const getUtmParamsFromSession = (): string => {
    const sessionDataRaw = sessionStorage.getItem('PREVIOUS_PAGE_VIEW');
    let utmQuery = '';

    console.log('Dados brutos do sessionStorage (PREVIOUS_PAGE_VIEW):', sessionDataRaw);

    if (sessionDataRaw) {
      try {
        // O valor é um array que contém uma string JSON
        const sessionArray = JSON.parse(sessionDataRaw);
        if (Array.isArray(sessionArray) && sessionArray.length > 0) {
          const sessionObject = JSON.parse(sessionArray[0]);

          console.log('Objeto parseado do sessionStorage:', sessionObject);

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

          console.log('UTM Query construída:', utmQuery);
        }
      } catch (error) {
        console.error('Erro ao parsear dados do sessionStorage:', error);
        // Em caso de erro, utmQuery permanecerá vazia
      }
    }

    return utmQuery;
  };

  // Verificar status do pagamento periodicamente
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (pixData && paymentStatus === 'PENDING') {
      intervalId = setInterval(async () => {
        try {
          const status = await verificarStatusPagamento(pixData.id);
          console.log('Status verificado:', status);
          
          if (status === 'APPROVED') {
            setPaymentStatus('APPROVED');
            setShowPaymentSuccess(true);
            clearInterval(intervalId);
          } else if (status === 'CANCELLED' || status === 'EXPIRED') {
            setPaymentStatus(status);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000); // Verificar a cada 5 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pixData, paymentStatus]);

  const generateRandomNumbers = (count: number): number[] => {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * 100000) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  };

  const handleNumberSelection = (count: number) => {
    const numbers = generateRandomNumbers(count);
    setSelectedNumbers(numbers);
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    
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
    }

    if (selectedNumbers.length === 0) {
      setError('Selecione pelo menos um número para participar');
      return false;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const totalAmount = selectedNumbers.length * 100; // R$ 1,00 por número em centavos
      
      // Obter UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();
      
      const response = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        totalAmount,
        `Rifa Super - ${selectedNumbers.length} número(s)`,
        utmQuery // Passar UTMs para a função
      );

      setPixData({
        pixQrCode: response.pixQrCode,
        pixCode: response.pixCode,
        id: response.id
      });
      
      setPaymentStatus('PENDING');
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formatted = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'phone') {
      const numbers = value.replace(/\D/g, '');
      const formatted = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[name as keyof FormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const copyToClipboard = async () => {
    if (pixData) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (showPaymentSuccess) {
    return <PaymentSuccessScreen />;
  }

  if (pixData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">PIX Gerado!</h2>
            <p className="text-gray-600">Escaneie o QR Code ou copie o código PIX</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200 flex justify-center">
              <img 
                src={pixData.pixQrCode} 
                alt="QR Code PIX" 
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
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
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Status do Pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                {paymentStatus === 'PENDING' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-yellow-700">Aguardando pagamento...</span>
                  </>
                )}
                {paymentStatus === 'APPROVED' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700">Pagamento aprovado!</span>
                  </>
                )}
                {(paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') && (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-700">Pagamento cancelado/expirado</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Valor: {formatPrice(selectedNumbers.length)}</p>
              <p>Números selecionados: {selectedNumbers.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="relative z-10 px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-400 text-yellow-800 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                🔥 ÚLTIMAS HORAS - PROMOÇÃO ESPECIAL
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              SUPER RIFA
              <span className="block text-yellow-300">SW4 0KM + MOTO BMW</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
              Concorra a uma <strong className="text-yellow-300">SW4 0KM</strong> + 
              <strong className="text-yellow-300"> Moto BMW</strong> por apenas 
              <strong className="text-yellow-300"> R$ 1,00</strong> por número!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Car className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                <div className="text-white font-bold">SW4 0KM</div>
                <div className="text-white/70 text-sm">Hilux SW4</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Bike className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                <div className="text-white font-bold">BMW</div>
                <div className="text-white/70 text-sm">Moto BMW</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Shield className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                <div className="text-white font-bold">Auditado</div>
                <div className="text-white/70 text-sm">LOTEP</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Trophy className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                <div className="text-white font-bold">Sorteio</div>
                <div className="text-white/70 text-sm">Transparente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
              <h2 className="text-2xl font-bold text-yellow-800 mb-2">
                Participe Agora!
              </h2>
              <p className="text-yellow-700">
                Apenas R$ 1,00 por número
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite seu nome completo"
                />
                {formErrors.name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com"
                />
                {formErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors ${
                    formErrors.cpf ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {formErrors.cpf && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.cpf}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors ${
                    formErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {formErrors.phone && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quantos números você quer? *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 10, 25, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleNumberSelection(count)}
                      className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                        selectedNumbers.length === count
                          ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-bold'
                          : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                      }`}
                    >
                      <div className="font-bold">{count}</div>
                      <div className="text-xs text-gray-600">
                        {formatPrice(count)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedNumbers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Números Selecionados ({selectedNumbers.length})
                    </span>
                  </div>
                  <div className="text-sm text-green-700 mb-2">
                    <strong>Total: {formatPrice(selectedNumbers.length)}</strong>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNumbers.slice(0, 10).map((num) => (
                      <span
                        key={num}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"
                      >
                        {num.toString().padStart(5, '0')}
                      </span>
                    ))}
                    {selectedNumbers.length > 10 && (
                      <span className="text-green-600 text-xs">
                        +{selectedNumbers.length - 10} mais...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || selectedNumbers.length === 0}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-800 font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-yellow-800 border-t-transparent rounded-full animate-spin"></div>
                    Gerando PIX...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    GERAR PIX - {formatPrice(selectedNumbers.length)}
                  </div>
                )}
              </button>

              <div className="text-center text-xs text-gray-500 space-y-1">
                <p>🔒 Pagamento 100% seguro via PIX</p>
                <p>⚡ Confirmação instantânea</p>
                <p>🏆 Sorteio auditado pela LOTEP</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;