import React, { useState, useEffect } from 'react';
import { Car, Trophy, Clock, Users, Shield, Star, Gift, Zap } from 'lucide-react';
import PaymentScreen from './components/PaymentScreen';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';
import OrderBumpModal from './components/OrderBumpModal';
import { gerarPix } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import { getUtmParamsFromUrl } from './utils/utmTracker';
import { PixResponse } from './types';

interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'payment' | 'success'>('main');
  const [selectedNumbers, setSelectedNumbers] = useState(20);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showOrderBump, setShowOrderBump] = useState(false);
  const [isOrderBumpLoading, setIsOrderBumpLoading] = useState(false);
  const [utmParams, setUtmParams] = useState<string>('');

  // Capturar UTMs quando o componente montar
  useEffect(() => {
    const capturedUtms = getUtmParamsFromUrl();
    setUtmParams(capturedUtms);
    console.log('UTMs capturados no App:', capturedUtms);
  }, []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const cleanPhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    if (field === 'cpf') {
      const formattedCpf = formatCpf(value);
      setCustomerData(prev => ({ ...prev, [field]: formattedCpf }));
    } else if (field === 'phone') {
      const formattedPhone = formatPhone(value);
      setCustomerData(prev => ({ ...prev, [field]: formattedPhone }));
    } else {
      setCustomerData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    if (!customerData.name.trim()) {
      alert('Por favor, preencha seu nome completo');
      return false;
    }

    if (!customerData.email.trim() || !customerData.email.includes('@')) {
      alert('Por favor, preencha um email válido');
      return false;
    }

    const cleanedCpf = cleanCpf(customerData.cpf);
    const cpfValidation = validateCpf(cleanedCpf);
    if (!cpfValidation.valid) {
      alert(cpfValidation.message || 'CPF inválido');
      return false;
    }

    const cleanedPhone = cleanPhone(customerData.phone);
    if (cleanedPhone.length < 10) {
      alert('Por favor, preencha um telefone válido');
      return false;
    }

    return true;
  };

  const handleParticipate = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const amountCentavos = selectedNumbers * 50; // R$0,50 por número
      const itemName = `${selectedNumbers} números da rifa - SW4 0KM + Moto BMW`;
      
      console.log('Enviando UTMs para gerarPix:', utmParams);
      
      const pixResponse = await gerarPix(
        customerData.name,
        customerData.email,
        cleanCpf(customerData.cpf),
        cleanPhone(customerData.phone),
        amountCentavos,
        itemName,
        utmParams // Passando os UTMs capturados
      );
      
      setPixData(pixResponse);
      setShowOrderBump(true);
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderBumpAccept = async () => {
    setIsOrderBumpLoading(true);
    
    try {
      const amountCentavos = (selectedNumbers * 50) + 10000; // Valor original + R$100,00
      const itemName = `${selectedNumbers + 100} números da rifa - SW4 0KM + Moto BMW (com boost)`;
      
      console.log('Enviando UTMs para Order Bump:', utmParams);
      
      const pixResponse = await gerarPix(
        customerData.name,
        customerData.email,
        cleanCpf(customerData.cpf),
        cleanPhone(customerData.phone),
        amountCentavos,
        itemName,
        utmParams // Passando os UTMs capturados
      );
      
      setPixData(pixResponse);
      setSelectedNumbers(prev => prev + 100);
      setShowOrderBump(false);
      setCurrentScreen('payment');
      
    } catch (error) {
      console.error('Erro ao gerar PIX do order bump:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsOrderBumpLoading(false);
    }
  };

  const handleOrderBumpDecline = () => {
    setShowOrderBump(false);
    setCurrentScreen('payment');
  };

  const handlePaymentConfirmed = () => {
    setCurrentScreen('success');
  };

  if (currentScreen === 'payment' && pixData) {
    return (
      <PaymentScreen
        pixData={pixData}
        onPaymentConfirmed={handlePaymentConfirmed}
        purchasedNumbers={selectedNumbers}
        totalAmount={selectedNumbers * 50}
        customerName={customerData.name}
      />
    );
  }

  if (currentScreen === 'success') {
    return (
      <PaymentSuccessScreen
        purchasedNumbers={selectedNumbers}
        customerData={customerData}
        utmParams={utmParams}
        initialPixData={pixData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700">
      {/* Order Bump Modal */}
      <OrderBumpModal
        isOpen={showOrderBump}
        onClose={() => setShowOrderBump(false)}
        onAccept={handleOrderBumpAccept}
        onDecline={handleOrderBumpDecline}
        isLoading={isOrderBumpLoading}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="relative z-10 px-4 py-20">
          <div className="max-w-md mx-auto text-center text-white">
            <div className="mb-6">
              <div className="text-6xl mb-4">🏆</div>
              <h1 className="text-3xl font-black mb-2 leading-tight">
                SUPER RIFA
              </h1>
              <p className="text-xl font-bold text-yellow-300">
                SW4 0KM + MOTO BMW
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-yellow-300">R$ 0,50</div>
                  <div className="text-sm text-white/80">por número</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-yellow-300">25.000</div>
                  <div className="text-sm text-white/80">números total</div>
                </div>
              </div>
              
              <div className="bg-green-500/20 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-green-100 font-bold">SORTEIO EM BREVE</span>
                </div>
                <div className="text-center text-green-100 text-sm">
                  Auditado pela LOTEP
                </div>
              </div>
            </div>

            {/* Prêmios */}
            <div className="space-y-3 mb-8">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-4 text-gray-800">
                <div className="flex items-center gap-3">
                  <Car className="w-8 h-8" />
                  <div className="text-left">
                    <div className="font-black text-lg">SW4 0KM</div>
                    <div className="text-sm font-medium">Toyota Hilux SW4</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏍️</div>
                  <div className="text-left">
                    <div className="font-black text-lg">MOTO BMW</div>
                    <div className="text-sm font-medium">BMW G 310 GS</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor de Números */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
              <h3 className="text-lg font-bold mb-4 text-center">
                Quantos números você quer?
              </h3>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[20, 50, 100, 200].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedNumbers(num)}
                    className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-200 ${
                      selectedNumbers === num
                        ? 'bg-yellow-400 text-gray-800 ring-4 ring-yellow-300'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-black text-yellow-300 mb-1">
                  R$ {(selectedNumbers * 0.5).toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-white/80">
                  {selectedNumbers} números selecionados
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Nome completo"
                value={customerData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 outline-none focus:border-yellow-400 transition-colors"
              />
              
              <input
                type="email"
                placeholder="E-mail"
                value={customerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 outline-none focus:border-yellow-400 transition-colors"
              />
              
              <input
                type="text"
                placeholder="CPF"
                value={customerData.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                maxLength={14}
                className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 outline-none focus:border-yellow-400 transition-colors"
              />
              
              <input
                type="text"
                placeholder="Telefone/WhatsApp"
                value={customerData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 outline-none focus:border-yellow-400 transition-colors"
              />
            </div>

            {/* Botão Principal */}
            <button
              onClick={handleParticipate}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-black py-6 px-8 rounded-2xl text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  GERANDO PIX...
                </div>
              ) : (
                <>
                  🎯 PARTICIPAR AGORA
                </>
              )}
            </button>

            {/* Badges de Confiança */}
            <div className="flex items-center justify-center gap-4 mt-6 text-sm">
              <div className="flex items-center gap-1 text-green-300">
                <Shield className="w-4 h-4" />
                <span>Seguro</span>
              </div>
              <div className="flex items-center gap-1 text-blue-300">
                <Users className="w-4 h-4" />
                <span>Confiável</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-300">
                <Star className="w-4 h-4" />
                <span>Auditado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;