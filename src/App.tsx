import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { pixService } from './services/pixService';
import { paymentStatusService } from './services/paymentStatusService';
import type { Customer, Transaction } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('participar');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [customerData, setCustomerData] = useState<Customer>({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (customerError) throw customerError;

      // Create PIX payment
      const pixResponse = await pixService.createPixPayment({
        value: 5000, // R$ 50,00 in cents
        customer: customerData
      });

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          payment_id: pixResponse.payment_id,
          customer_id: customer.id,
          status: 'pending',
          payment_method: 'pix',
          total_value: 5000,
          pix_code: pixResponse.pix_code
        }]);

      if (transactionError) throw transactionError;

      setPixCode(pixResponse.pix_code);
      setPaymentId(pixResponse.payment_id);
      setShowPixModal(true);

      // Start polling for payment status
      paymentStatusService.startPolling(pixResponse.payment_id, (status) => {
        setPaymentStatus(status);
        if (status === 'approved') {
          setShowPixModal(false);
          // Handle successful payment
        }
      });

    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderParticiparContent = () => (
    <>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Participe do Sorteio
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={customerData.name}
              onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Digite seu nome completo"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={customerData.email}
              onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Digite seu email"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">
              CPF
            </label>
            <input
              type="text"
              required
              value={customerData.cpf}
              onChange={(e) => setCustomerData({...customerData, cpf: e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">
              Telefone
            </label>
            <input
              type="tel"
              required
              value={customerData.phone}
              onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="(00) 00000-0000"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold py-4 px-6 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processando...' : 'Participar por R$ 50,00'}
          </button>
        </form>
      </div>

      {/* PIX Payment Modal */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Pagamento PIX
            </h3>
            
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-4">
                Escaneie o QR Code ou copie o código PIX abaixo:
              </p>
              
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <code className="text-sm break-all">{pixCode}</code>
              </div>
              
              <button
                onClick={() => navigator.clipboard.writeText(pixCode)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Copiar Código PIX
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Status: {paymentStatus === 'pending' ? 'Aguardando pagamento...' : 'Pagamento aprovado!'}
              </p>
              
              <button
                onClick={() => setShowPixModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderConsultarContent = () => (
    <div className="mt-6">
      {/* Content */}
    </div>
  );

  const renderRankingContent = () => (
    <div className="mt-6">
      {/* Content */}
    </div>
  );

  const renderResultadosContent = () => (
    <div className="mt-6">
      {/* Content */}
    </div>
  );

  const renderSobreContent = () => (
    <div className="mt-6">
      {/* Content */}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              🚗 SORTEIO SW4 2024 🚗
            </h1>
            <p className="text-xl text-white/90">
              Concorra a uma Toyota SW4 0KM!
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { id: 'participar', label: 'Participar' },
              { id: 'consultar', label: 'Consultar' },
              { id: 'ranking', label: 'Ranking' },
              { id: 'resultados', label: 'Resultados' },
              { id: 'sobre', label: 'Sobre' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-yellow-400 text-green-900 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'participar' && renderParticiparContent()}
          {activeTab === 'consultar' && renderConsultarContent()}
          {activeTab === 'ranking' && renderRankingContent()}
          {activeTab === 'resultados' && renderResultadosContent()}
          {activeTab === 'sobre' && renderSobreContent()}
        </div>
      </main>

      {/* Prize Image */}
      <div className="fixed bottom-4 right-4 z-20">
        <img
          src="/sw4-car.jpg"
          alt="Toyota SW4"
          className="w-32 h-20 object-cover rounded-lg shadow-lg opacity-80"
        />
      </div>
    </div>
  );
}

export default App;