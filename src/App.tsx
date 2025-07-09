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
  AlertCircle,
  X
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
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Função para gerar números aleatórios
  const generateRandomNumbers = (count: number) => {
    const numbers = [];
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * 100000) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  // Função para selecionar números
  const selectNumbers = (count: number) => {
    const numbers = generateRandomNumbers(count);
    setSelectedNumbers(numbers);
    setCurrentStep(2);
  };

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

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formatted = formatCPF(value);
      if (formatted.replace(/\D/g, '').length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatted }));
      }
    } else if (name === 'phone') {
      const formatted = formatPhone(value);
      if (formatted.replace(/\D/g, '').length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatted }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Função para validar formulário
  const isFormValid = () => {
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    const phoneNumbers = formData.phone.replace(/\D/g, '');
    
    return (
      formData.name.trim().length >= 2 &&
      formData.email.includes('@') &&
      cpfNumbers.length === 11 &&
      phoneNumbers.length >= 10
    );
  };

  // Função para gerar PIX
  const handleGeneratePix = async () => {
    if (!isFormValid()) return;

    setIsGeneratingPix(true);
    setPixError(null);

    try {
      const totalValue = selectedNumbers.length * 100; // R$ 1,00 por número em centavos
      const itemName = `${selectedNumbers.length} números da Super Rifa`;
      
      // Capturar parâmetros UTM da URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmQuery = urlParams.toString();

      const response = await gerarPix(
        formData.name,
        formData.email,
        formData.cpf.replace(/\D/g, ''),
        formData.phone.replace(/\D/g, ''),
        totalValue,
        itemName,
        utmQuery
      );

      setPixData(response);
      setShowModal(true);
      
      // Iniciar verificação de status
      setIsCheckingPayment(true);
      startPaymentStatusCheck(response.id);
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setPixError(error instanceof Error ? error.message : 'Erro desconhecido ao gerar PIX');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  // Função para verificar status do pagamento
  const startPaymentStatusCheck = (paymentId: string) => {
    const checkStatus = async () => {
      try {
        const status = await verificarStatusPagamento(paymentId);
        setPaymentStatus(status);
        
        if (status === 'APPROVED') {
          setIsCheckingPayment(false);
          // Não fechar o modal aqui, apenas atualizar o status
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          setIsCheckingPayment(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    };

    // Verificar imediatamente
    checkStatus();
    
    // Continuar verificando a cada 3 segundos se ainda estiver pendente
    const interval = setInterval(async () => {
      if (paymentStatus === 'PENDING') {
        await checkStatus();
      } else {
        clearInterval(interval);
      }
    }, 3000);

    // Limpar interval após 10 minutos
    setTimeout(() => {
      clearInterval(interval);
      setIsCheckingPayment(false);
    }, 600000);
  };

  // Função para copiar código PIX
  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
    }
  };

  // Função para fechar modal
  const closeModal = () => {
    setShowModal(false);
    setPixData(null);
    setPaymentStatus('PENDING');
    setIsCheckingPayment(false);
  };

  // Função para voltar ao início
  const resetToStart = () => {
    setCurrentStep(1);
    setSelectedNumbers([]);
    setFormData({ name: '', email: '', cpf: '', phone: '' });
    closeModal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 text-center">
        <h1 className="text-2xl font-black text-green-900">🏆 SUPER RIFA 🏆</h1>
        <p className="text-green-800 font-semibold">SW4 0KM + MOTO BMW • Sorteio pela LOTEP</p>
      </div>

      {/* Prêmios */}
      <div className="bg-white/10 backdrop-blur-sm p-6 mx-4 mt-4 rounded-2xl border border-white/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Car className="w-16 h-16 mx-auto text-yellow-400 mb-2" />
            <h3 className="text-white font-bold">1º PRÊMIO</h3>
            <p className="text-yellow-300 text-sm">SW4 0KM</p>
          </div>
          <div className="text-center">
            <Bike className="w-16 h-16 mx-auto text-yellow-400 mb-2" />
            <h3 className="text-white font-bold">2º PRÊMIO</h3>
            <p className="text-yellow-300 text-sm">MOTO BMW</p>
          </div>
        </div>
      </div>

      {/* Imagem dos prêmios */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden">
        <img 
          src="/sw4-car.jpg" 
          alt="SW4 e BMW" 
          className="w-full h-48 object-cover"
        />
      </div>

      {/* Contador de vendas */}
      <div className="bg-red-500 mx-4 mt-4 p-4 rounded-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users className="w-5 h-5 text-white" />
          <span className="text-white font-bold">VENDAS EM TEMPO REAL</span>
        </div>
        <div className="text-2xl font-black text-white">47.382 NÚMEROS VENDIDOS</div>
        <div className="text-white/80 text-sm">Restam apenas 52.618 números!</div>
      </div>

      {/* Urgência */}
      <div className="bg-yellow-400 mx-4 mt-4 p-4 rounded-xl text-center border-4 border-red-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-red-600 animate-pulse" />
          <span className="text-red-600 font-bold">ÚLTIMAS HORAS!</span>
        </div>
        <div className="text-red-600 font-black">Sorteio em 48 horas</div>
        <div className="text-red-700 text-sm">Não perca essa oportunidade única!</div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-white mb-2">
                Escolha quantos números quer!
              </h2>
              <p className="text-yellow-300 text-lg">
                Apenas R$ 1,00 por número
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { count: 5, popular: false },
                { count: 10, popular: true },
                { count: 25, popular: false },
                { count: 50, popular: false }
              ].map(({ count, popular }) => (
                <button
                  key={count}
                  onClick={() => selectNumbers(count)}
                  className={`relative p-4 rounded-xl font-bold text-lg transition-all hover:scale-105 ${
                    popular 
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 ring-4 ring-yellow-300' 
                      : 'bg-white/20 text-white border-2 border-white/50 hover:bg-white/30'
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      POPULAR
                    </div>
                  )}
                  <div className="text-2xl font-black">{count} números</div>
                  <div className="text-sm opacity-80">R$ {count},00</div>
                </button>
              ))}
            </div>

            <div className="bg-green-500/20 border border-green-400 rounded-xl p-4 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-bold">BÔNUS ESPECIAL</span>
              </div>
              <p className="text-white text-sm">
                Comprando 10 ou mais números, você ganha chances extras no sorteio!
              </p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Seus números selecionados
              </h2>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {selectedNumbers.map((num) => (
                    <div key={num} className="bg-yellow-400 text-green-900 font-bold text-sm p-2 rounded text-center">
                      {num.toString().padStart(5, '0')}
                    </div>
                  ))}
                </div>
                <div className="text-yellow-300 font-bold">
                  Total: {selectedNumbers.length} números = R$ {selectedNumbers.length},00
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Dados para pagamento</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Nome completo</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Telefone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {pixError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-800 text-sm">{pixError}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 px-6 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleGeneratePix}
                  disabled={!isFormValid() || isGeneratingPix}
                  className="flex-1 py-3 px-6 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingPix ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    'Gerar PIX'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal do PIX */}
      {showModal && pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {paymentStatus === 'APPROVED' ? 'Pagamento Confirmado!' : 'Pagamento via PIX'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {paymentStatus === 'APPROVED' ? (
                // NOVA TELA DE CONFIRMAÇÃO DE PAGAMENTO
                <div className="text-center space-y-6">
                  <div className="text-6xl">🎉</div>
                  
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-green-600">
                      Parabéns! Você é o milésimo comprador da Super Rifa!
                    </h2>
                    
                    <div className="text-6xl">🎉</div>
                    
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 space-y-3">
                      <p className="text-gray-800 font-medium">
                        E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
                      </p>
                      
                      <p className="text-gray-800 font-bold">
                        Sim, é isso mesmo…
                      </p>
                      
                      <p className="text-red-600 font-bold">
                        👉 Mas atenção: para receber, você precisa chamar AGORA no WhatsApp.
                      </p>
                      
                      <div className="bg-red-50 border border-red-500 rounded-lg p-3">
                        <p className="text-red-800 font-bold flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          ⏳ O prêmio só será liberado nas próximas 2 horas.
                        </p>
                        <p className="text-red-700 font-medium mt-1">
                          Se passar do tempo… perde!
                        </p>
                      </div>
                      
                      <p className="text-gray-700 text-sm">
                        🎁 (Mas seja rápido, essa chance é única.)
                      </p>
                    </div>
                  </div>
                  
                  <a
                    href="https://wa.me/5563992141134"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
                  >
                    🎁 CLIQUE AQUI para garantir seu prêmio
                  </a>
                  
                  <button
                    onClick={resetToStart}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
                  >
                    Fazer nova compra
                  </button>
                </div>
              ) : (
                // TELA ORIGINAL DO PIX (quando ainda não foi pago)
                <div className="space-y-4">
                  {isCheckingPayment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-blue-800 font-medium">
                          Aguardando pagamento...
                        </span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        Assim que você pagar, confirmaremos automaticamente.
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block">
                      <img 
                        src={pixData.pixQrCode} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    <p className="text-gray-600 text-sm mt-2">
                      Escaneie o QR Code com seu app do banco
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-gray-700 font-medium">
                      Ou copie o código PIX:
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
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">Seus números:</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {selectedNumbers.slice(0, 10).map((num) => (
                        <div key={num} className="bg-green-100 text-green-800 text-xs p-1 rounded text-center font-medium">
                          {num.toString().padStart(5, '0')}
                        </div>
                      ))}
                      {selectedNumbers.length > 10 && (
                        <div className="bg-green-100 text-green-800 text-xs p-1 rounded text-center font-medium">
                          +{selectedNumbers.length - 10}
                        </div>
                      )}
                    </div>
                    <div className="text-green-700 font-bold mt-2">
                      Total: R$ {selectedNumbers.length},00
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      <strong>Importante:</strong> Após o pagamento, seus números serão confirmados automaticamente. 
                      Mantenha esta tela aberta para acompanhar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-800/80 text-white p-6 mt-8">
        <div className="text-center space-y-2">
          <p className="text-sm">
            <strong>Sorteio:</strong> Realizado pela LOTEP (Loteria do Estado do Tocantins)
          </p>
          <p className="text-xs text-gray-300">
            Sorteio 100% transparente e auditado • Resultado em tempo real
          </p>
          <div className="flex justify-center items-center gap-2 mt-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xs">Licenciado e regulamentado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;