import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Gift, 
  Clock, 
  Users, 
  CheckCircle, 
  Copy, 
  QrCode, 
  AlertCircle,
  Loader2,
  MessageCircle,
  Trophy,
  Zap
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
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [showPayment, setShowPayment] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'cancelled'>('pending');
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Gerar números de 1 a 1000
  const numbers = Array.from({ length: 1000 }, (_, i) => i + 1);

  // Simular números já vendidos (para demonstração)
  const soldNumbers = new Set([15, 23, 45, 67, 89, 123, 156, 234, 345, 456, 567, 678, 789, 890]);

  const handleNumberClick = (number: number) => {
    if (soldNumbers.has(number)) return;
    
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else {
        return [...prev, number];
      }
    });
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
    if (!formData.name.trim()) return 'Nome é obrigatório';
    if (!formData.email.trim()) return 'Email é obrigatório';
    if (!formData.email.includes('@')) return 'Email inválido';
    if (formData.cpf.replace(/\D/g, '').length !== 11) return 'CPF deve ter 11 dígitos';
    if (formData.phone.replace(/\D/g, '').length < 10) return 'Telefone inválido';
    if (selectedNumbers.length === 0) return 'Selecione pelo menos um número';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const totalAmount = selectedNumbers.length * 100; // R$ 1,00 por número em centavos
      const itemName = `Super Rifa - ${selectedNumbers.length} número${selectedNumbers.length > 1 ? 's' : ''}`;
      
      // Capturar UTM parameters da URL
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
      setShowPayment(true);
      
      // Iniciar verificação de status
      startPaymentStatusCheck(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    setCheckingPayment(true);
    
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        console.log('Status verificado:', status);
        
        if (status === 'APPROVED') {
          setPaymentStatus('approved');
          setCheckingPayment(false);
          return;
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setPaymentStatus('cancelled');
          setCheckingPayment(false);
          return;
        }
        
        // Continue checking if still pending
        if (status === 'PENDING') {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        // Continue checking on error
        setTimeout(checkStatus, 10000); // Check every 10 seconds on error
      }
    };

    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
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

  const totalValue = selectedNumbers.length * 1; // R$ 1,00 por número

  if (paymentStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Ícone de troféu animado */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full mx-auto flex items-center justify-center animate-bounce">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Título principal */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🎉 Parabéns! Você é o milésimo comprador da Super Rifa! 🎉
          </h1>

          {/* Subtítulo */}
          <p className="text-lg text-gray-700 mb-4">
            E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
          </p>

          {/* Destaque */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
            <p className="text-lg font-semibold text-gray-800 mb-2">
              Sim, é isso mesmo…
            </p>
            <p className="text-base text-gray-700">
              👉 Mas atenção: para receber, você precisa chamar <strong>AGORA</strong> no WhatsApp.
            </p>
          </div>

          {/* Urgência */}
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-base font-semibold text-red-800">
                ⏳ O prêmio só será liberado nas próximas 2 horas.
              </p>
            </div>
            <p className="text-sm text-red-700">
              Se passar do tempo… perde!
            </p>
          </div>

          {/* Call to action */}
          <p className="text-lg font-semibold text-gray-800 mb-4">
            🎁 CLIQUE AQUI para garantir seu prêmio
          </p>
          <p className="text-sm text-gray-600 mb-6">
            (Mas seja rápido, essa chance é única.)
          </p>

          {/* Botão WhatsApp */}
          <a
            href="https://wa.me/5563992141134"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-lg">Chamar no WhatsApp</span>
          </a>

          {/* Números selecionados */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-800 mb-2">
              Seus números da sorte:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {selectedNumbers.sort((a, b) => a - b).map(number => (
                <span
                  key={number}
                  className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  {number.toString().padStart(4, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showPayment && pixData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white text-center">
            <QrCode className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-xl font-bold">Pagamento PIX</h2>
            <p className="text-blue-100 mt-1">
              Escaneie o QR Code ou copie o código
            </p>
          </div>

          <div className="p-6">
            {/* Status do pagamento */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                {checkingPayment ? (
                  <Loader2 className="w-5 h-5 text-yellow-600 animate-spin mr-2" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                )}
                <div>
                  <p className="font-semibold text-yellow-800">
                    {checkingPayment ? 'Verificando pagamento...' : 'Aguardando pagamento'}
                  </p>
                  <p className="text-sm text-yellow-700">
                    O status será atualizado automaticamente
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src={pixData.pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
            </div>

            {/* Código PIX */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código PIX (Copia e Cola)
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={pixData.pixCode}
                  readOnly
                  className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(pixData.pixCode)}
                  className="px-4 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-1">Código copiado!</p>
              )}
            </div>

            {/* Resumo do pedido */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Resumo do Pedido</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Números selecionados:</span>
                  <span className="font-medium">{selectedNumbers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por número:</span>
                  <span className="font-medium">R$ 1,00</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-green-600">R$ {totalValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Números selecionados */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Seus números:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedNumbers.sort((a, b) => a - b).map(number => (
                  <span
                    key={number}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {number.toString().padStart(4, '0')}
                  </span>
                ))}
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Como pagar:</h4>
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50"></div>
        <div 
          className="h-96 bg-cover bg-center relative"
          style={{
            backgroundImage: 'url("https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1")'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
            <div className="text-white max-w-2xl">
              <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                Super Rifa
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/80">
                Concorra a uma SW4 0KM + Moto BMW
              </p>
              <div className="flex items-center space-x-6 text-lg">
                <div className="flex items-center">
                  <Gift className="w-6 h-6 mr-2" />
                  <span>Apenas R$ 1,00</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  <span>1000 números</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Seleção de números */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Escolha seus números da sorte
                </h2>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Selecionados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedNumbers.length}
                  </p>
                </div>
              </div>

              {/* Grid de números */}
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-6">
                {numbers.map(number => {
                  const isSelected = selectedNumbers.includes(number);
                  const isSold = soldNumbers.has(number);
                  
                  return (
                    <button
                      key={number}
                      onClick={() => handleNumberClick(number)}
                      disabled={isSold}
                      className={`
                        aspect-square rounded-lg text-sm font-semibold transition-all duration-200
                        ${isSold 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : isSelected
                            ? 'bg-green-500 text-white shadow-lg transform scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:scale-105'
                        }
                      `}
                    >
                      {number.toString().padStart(4, '0')}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
                  <span>Disponível</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span>Selecionado</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
                  <span>Vendido</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário e resumo */}
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Resumo</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Números selecionados:</span>
                  <span className="font-semibold">{selectedNumbers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor por número:</span>
                  <span className="font-semibold">R$ 1,00</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-green-600">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedNumbers.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Números selecionados:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNumbers.sort((a, b) => a - b).map(number => (
                      <span
                        key={number}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"
                      >
                        {number.toString().padStart(4, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Seus dados
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="Digite seu nome completo"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="seu@email.com"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="000.000.000-00"
                    maxLength={14}
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || selectedNumbers.length === 0}
                className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Car className="w-5 h-5 mr-2" />
                    Participar da Rifa
                  </>
                )}
              </button>
            </div>

            {/* Prêmios */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Prêmios</h3>
              
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mr-3">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">1º Prêmio</p>
                    <p className="text-sm text-gray-600">SW4 0KM</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">2º Prêmio</p>
                    <p className="text-sm text-gray-600">Moto BMW</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;