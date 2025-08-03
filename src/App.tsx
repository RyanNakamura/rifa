import React, { useState } from 'react';
import { Trophy, Gift, Users, Clock, Star, Zap, Target, Award } from 'lucide-react';
import { gerarPix } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import { getUtmParamsFromSession } from './utils/utmTracker';
import PaymentScreen from './components/PaymentScreen';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';
import OrderBumpModal from './components/OrderBumpModal';
import RouletteScreen from './components/RouletteScreen';
import TaxPaymentScreen from './components/TaxPaymentScreen';
import { PixResponse } from './types';

interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

type AppState = 'form' | 'payment' | 'roulette' | 'tax-payment' | 'success';

function App() {
  // Estados principais
  const [currentState, setCurrentState] = useState<AppState>('form');
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [purchasedNumbers, setPurchasedNumbers] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isFirstPayment, setIsFirstPayment] = useState(true);
  const [winningNumber, setWinningNumber] = useState(0);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    selectedNumbers: 20
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showOrderBump, setShowOrderBump] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpar erro quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else {
      const cleanedCpf = cleanCpf(formData.cpf);
      const cpfValidation = validateCpf(cleanedCpf);
      if (!cpfValidation.valid) {
        newErrors.cpf = cpfValidation.message || 'CPF inválido';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função principal para processar o pagamento
  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const amountCentavos = formData.selectedNumbers * 50; // R$ 0,50 por número
      const itemName = `${formData.selectedNumbers} números da Super Rifa`;
      
      // Capturar UTMs da sessão
      const utmQuery = getUtmParamsFromSession();
      console.log('UTMs capturados para pagamento:', utmQuery);

      const pixResponse = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        formData.phone,
        amountCentavos,
        itemName,
        utmQuery
      );

      // Salvar dados para uso posterior
      setPixData(pixResponse);
      setCustomerData({
        name: formData.name,
        email: formData.email,
        cpf: cleanedCpf,
        phone: formData.phone
      });
      setPurchasedNumbers(formData.selectedNumbers);
      setTotalAmount(amountCentavos);

      // Ir para tela de pagamento
      setCurrentState('payment');
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função chamada quando o pagamento é confirmado
  const handlePaymentConfirmed = () => {
    console.log('Pagamento confirmado! isFirstPayment:', isFirstPayment);
    
    if (isFirstPayment) {
      // Se é o primeiro pagamento, mostrar order bump
      setShowOrderBump(true);
    } else {
      // Se não é o primeiro pagamento, ir direto para sucesso
      setCurrentState('success');
    }
  };

  // Função para aceitar o order bump
  const handleOrderBumpAccept = async () => {
    if (!customerData) return;

    setIsLoading(true);
    
    try {
      const amountCentavos = 1000; // R$ 10,00 em centavos para 100 números extras
      const itemName = '100 números extras da Super Rifa';
      
      const utmQuery = getUtmParamsFromSession();
      
      const pixResponse = await gerarPix(
        customerData.name,
        customerData.email,
        customerData.cpf,
        customerData.phone,
        amountCentavos,
        itemName,
        utmQuery
      );

      // Atualizar dados do PIX
      setPixData(pixResponse);
      setPurchasedNumbers(prev => prev + 100);
      setTotalAmount(prev => prev + amountCentavos);
      setIsFirstPayment(false); // Não é mais o primeiro pagamento

      // Fechar modal e voltar para tela de pagamento
      setShowOrderBump(false);
      setCurrentState('payment');
      
    } catch (error) {
      console.error('Erro ao gerar PIX do order bump:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para recusar o order bump
  const handleOrderBumpDecline = () => {
    setShowOrderBump(false);
    
    // Se é o primeiro pagamento, ir para a roleta
    if (isFirstPayment) {
      const randomWinningNumber = Math.floor(Math.random() * 25000);
      setWinningNumber(randomWinningNumber);
      setCurrentState('roulette');
    } else {
      // Se não é o primeiro pagamento, ir direto para sucesso
      setCurrentState('success');
    }
  };

  // Função chamada quando a roleta termina
  const handleRouletteComplete = () => {
    setCurrentState('tax-payment');
  };

  // Renderização condicional baseada no estado atual
  if (currentState === 'payment' && pixData && customerData) {
    return (
      <PaymentScreen
        pixData={pixData}
        onPaymentConfirmed={handlePaymentConfirmed}
        purchasedNumbers={purchasedNumbers}
        totalAmount={totalAmount}
        customerName={customerData.name}
      />
    );
  }

  if (currentState === 'roulette' && customerData) {
    return (
      <RouletteScreen
        onComplete={handleRouletteComplete}
        customerName={customerData.name}
      />
    );
  }

  if (currentState === 'tax-payment' && customerData) {
    return (
      <TaxPaymentScreen
        customerName={customerData.name}
        winningNumber={winningNumber}
        prizeAmount={15000}
      />
    );
  }

  if (currentState === 'success') {
    return (
      <PaymentSuccessScreen
        purchasedNumbers={purchasedNumbers}
        customerData={customerData}
        utmParams={getUtmParamsFromSession()}
        initialPixData={pixData}
      />
    );
  }

  // Tela principal do formulário
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700">
      {/* Order Bump Modal */}
      {showOrderBump && (
        <OrderBumpModal
          isOpen={showOrderBump}
          onClose={() => setShowOrderBump(false)}
          onAccept={handleOrderBumpAccept}
          onDecline={handleOrderBumpDecline}
          isLoading={isLoading}
        />
      )}

      {/* Header com gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        
        {/* Imagem de fundo */}
        <div className="relative h-48 bg-cover bg-center" style={{
          backgroundImage: 'url("https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1")'
        }}>
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative z-10 flex items-center justify-center h-full text-center px-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">
                🏆 SUPER RIFA 🏆
              </h1>
              <p className="text-white/80 text-lg font-semibold">
                SW4 0KM + Moto BMW
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative -mt-8 px-4 pb-24">
        <div className="max-w-md mx-auto">
          
          {/* Card principal */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Seção de prêmios */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Trophy className="w-6 h-6" />
                <span className="text-lg font-bold">PRÊMIOS INCRÍVEIS</span>
              </div>
              
              <div className="space-y-2">
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-2xl font-black">🚗 SW4 0KM</div>
                  <div className="text-sm">Toyota Hilux SW4 Zero Quilômetro</div>
                </div>
                
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-2xl font-black">🏍️ BMW</div>
                  <div className="text-sm">Moto BMW Premium</div>
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Participe Agora!
                </h2>
                <p className="text-gray-600">
                  Apenas R$ 0,50 por número
                </p>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none transition-colors ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Digite seu nome completo"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="seu@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className={`w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none transition-colors ${
                      errors.cpf ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full p-3 border-2 rounded-xl focus:border-green-500 outline-none transition-colors ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(11) 99999-9999"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* Seleção de números */}
                <div>
                  <label className="block text-gray-700 font-bold mb-3">
                    Quantos números você quer?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[20, 50, 100, 200].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, selectedNumbers: num }))}
                        className={`p-3 rounded-xl border-2 font-bold transition-all ${
                          formData.selectedNumbers === num
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:border-green-300'
                        }`}
                      >
                        <div className="text-lg">{num} números</div>
                        <div className="text-sm text-gray-600">
                          R$ {(num * 0.5).toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão de pagamento */}
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      GERANDO PIX...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      PAGAR VIA PIX - R$ {(formData.selectedNumbers * 0.5).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-6 space-y-4">
            {/* Estatísticas */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">25.000</div>
                  <div className="text-sm text-white/80">Números disponíveis</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">R$ 0,50</div>
                  <div className="text-sm text-white/80">Por número</div>
                </div>
              </div>
            </div>

            {/* Garantias */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Garantias
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Sorteio transparente e auditado
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Pagamento seguro via PIX
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Números confirmados por WhatsApp
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;