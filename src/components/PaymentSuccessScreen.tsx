import React, { useEffect, useState } from 'react';
import { Gift, Clock, MessageCircle } from 'lucide-react';

interface PaymentSuccessScreenProps {
  onClose: () => void;
}

export default function PaymentSuccessScreen({ onClose }: PaymentSuccessScreenProps) {
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60); // 2 horas em segundos

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = '5563992141134';
    const message = encodeURIComponent('Olá! Sou o milésimo comprador da Super Rifa e gostaria de receber meu prêmio exclusivo!');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-yellow-50 opacity-50"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Celebration header */}
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Gift className="w-16 h-16 text-yellow-500 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl font-black text-green-800 mb-2">
              🎉 Parabéns! Você é o milésimo comprador da Super Rifa! 🎉
            </h1>
            
            <p className="text-gray-700 font-medium">
              E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
            </p>
          </div>

          {/* Main message */}
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-green-100 rounded-xl border-2 border-yellow-200">
            <p className="text-lg font-bold text-gray-800 mb-2">
              Sim, é isso mesmo…
            </p>
            <p className="text-gray-700 font-medium">
              👉 Mas atenção: para receber, você precisa chamar <strong>AGORA</strong> no WhatsApp.
            </p>
          </div>

          {/* Timer */}
          <div className="mb-6 p-4 bg-red-50 rounded-xl border-2 border-red-500">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-bold">Tempo restante:</span>
            </div>
            <div className="text-3xl font-black text-red-600 mb-2">
              {formatTime(timeLeft)}
            </div>
            <p className="text-red-700 font-medium text-sm">
              ⏳ O prêmio só será liberado nas próximas 2 horas.<br />
              Se passar do tempo… perde!
            </p>
          </div>

          {/* WhatsApp button */}
          <div className="mb-4">
            <button
              onClick={handleWhatsAppClick}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6" />
              <div className="text-left">
                <div className="text-lg">🎁 CLIQUE AQUI para garantir seu prêmio</div>
                <div className="text-sm opacity-90">(Mas seja rápido, essa chance é única.)</div>
              </div>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>

        {/* Animated particles */}
        <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-6 w-1 h-1 bg-green-400 rounded-full animate-bounce delay-200"></div>
        <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 bg-green-300 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}