import React from 'react';
import { Gift, Clock, MessageCircle } from 'lucide-react';

const PaymentSuccessScreen: React.FC = () => {
  const whatsappNumber = '5563992141134';
  const whatsappMessage = encodeURIComponent('Olá! Sou o milésimo comprador da Super Rifa e gostaria de receber meu prêmio exclusivo!');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-300 rounded-full opacity-20"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-200 rounded-full opacity-20"></div>
        
        {/* Success animation */}
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce">
            <Gift className="w-10 h-10 text-white" />
          </div>

          {/* Main message */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4 leading-tight">
            🎉 Parabéns! Você é o milésimo comprador da Super Rifa! 🎉
          </h1>

          <div className="space-y-3 text-gray-700 mb-6">
            <p className="text-base">
              E como forma de agradecimento, você acabou de desbloquear um <strong>prêmio exclusivo</strong>.
            </p>
            
            <p className="text-lg font-semibold text-green-700">
              Sim, é isso mesmo…
            </p>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 my-4">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-orange-600 font-semibold">ATENÇÃO!</span>
              </div>
              <p className="text-sm text-gray-700">
                👉 Para receber, você precisa chamar <strong>AGORA</strong> no WhatsApp.
              </p>
              <p className="text-sm text-red-600 font-medium mt-2">
                ⏳ O prêmio só será liberado nas próximas <strong>2 horas</strong>.
                <br />
                Se passar do tempo… perde!
              </p>
            </div>
          </div>

          {/* WhatsApp button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <MessageCircle className="w-6 h-6" />
              <span>🎁 CLIQUE AQUI para garantir seu prêmio</span>
            </div>
          </a>

          <p className="text-xs text-gray-500 mt-3">
            (Mas seja rápido, essa chance é única.)
          </p>

          {/* Urgency indicators */}
          <div className="flex justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-200"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessScreen;