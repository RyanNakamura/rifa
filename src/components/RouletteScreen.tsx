import React, { useState, useEffect } from 'react';
import { Trophy, Gift, Sparkles, ArrowRight } from 'lucide-react';

interface RouletteScreenProps {
  onComplete: () => void;
  customerName: string;
}

const RouletteScreen: React.FC<RouletteScreenProps> = ({ onComplete, customerName }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number>(0);
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Números para a roleta (simulando números da rifa)
  const rouletteNumbers = Array.from({ length: 20 }, (_, i) => Math.floor(Math.random() * 25000));
  
  useEffect(() => {
    // Auto-iniciar a roleta após 2 segundos
    const timer = setTimeout(() => {
      startRoulette();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const startRoulette = () => {
    setIsSpinning(true);
    const finalNumber = Math.floor(Math.random() * 25000);
    setWinningNumber(finalNumber);

    // Animação de números girando
    let counter = 0;
    const spinInterval = setInterval(() => {
      setCurrentNumber(rouletteNumbers[counter % rouletteNumbers.length]);
      counter++;
    }, 100);

    // Parar a roleta após 4 segundos
    setTimeout(() => {
      clearInterval(spinInterval);
      setCurrentNumber(finalNumber);
      setIsSpinning(false);
      
      // Mostrar resultado após 1 segundo
      setTimeout(() => {
        setShowResult(true);
        setShowCelebration(true);
      }, 1000);
    }, 4000);
  };

  const formatNumber = (num: number) => {
    return num.toString().padStart(5, '0');
  };

  if (!showResult) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50">
        {/* Partículas de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="text-center text-white z-10">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-4 text-yellow-300">
              🎰 SORTEIO ESPECIAL 🎰
            </h1>
            <p className="text-xl text-blue-100">
              Verificando se você foi contemplado...
            </p>
          </div>

          {/* Roleta */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl">
            <div className="relative">
              {/* Display do número */}
              <div className="bg-black rounded-2xl p-6 mb-6 border-4 border-yellow-400">
                <div className={`text-6xl font-black text-yellow-400 font-mono transition-all duration-100 ${
                  isSpinning ? 'animate-pulse scale-110' : ''
                }`}>
                  {formatNumber(currentNumber)}
                </div>
              </div>

              {/* Indicador de giro */}
              {isSpinning && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-yellow-400 animate-bounce"></div>
                </div>
              )}
            </div>

            <div className="text-center">
              {isSpinning ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                  <span className="text-yellow-300 font-bold">SORTEANDO...</span>
                </div>
              ) : (
                <span className="text-blue-200">Aguarde o resultado...</span>
              )}
            </div>
          </div>

          <div className="mt-6 text-blue-200">
            <p>🍀 Boa sorte, {customerName}!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 flex items-center justify-center z-50 overflow-hidden">
      {/* Confetes animados */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center text-white z-10 p-6 max-w-md w-full mx-auto">
        {/* Ícones de celebração */}
        <div className="mb-6 relative">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <div className="absolute -top-4 -left-4 text-4xl animate-spin">✨</div>
          <div className="absolute -top-4 -right-4 text-4xl animate-spin" style={{ animationDirection: 'reverse' }}>⭐</div>
        </div>

        {/* Título de parabéns */}
        <h1 className="text-4xl font-black mb-4 text-yellow-300 animate-pulse">
          🎉 PARABÉNS! 🎉
        </h1>

        {/* Número vencedor */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border-4 border-yellow-400">
          <p className="text-lg mb-2 text-yellow-200">Seu número sorteado:</p>
          <div className="text-5xl font-black text-yellow-400 font-mono mb-4">
            {formatNumber(winningNumber)}
          </div>
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-black py-2 px-4 rounded-xl text-lg">
            NÚMERO PREMIADO! 🎯
          </div>
        </div>

        {/* Prêmio */}
        <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl p-6 mb-6 text-black">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="w-6 h-6" />
            <span className="font-bold text-lg">VOCÊ GANHOU:</span>
          </div>
          <div className="text-4xl font-black mb-2">R$ 15.000,00</div>
          <div className="text-sm font-semibold">💰 Prêmio em dinheiro via PIX!</div>
        </div>

        {/* Mensagem personalizada */}
        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <p className="text-yellow-200 font-semibold">
            🎊 {customerName}, você foi contemplado no nosso sorteio especial!
          </p>
        </div>

        {/* Botão para continuar */}
        <button
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-black py-4 px-6 rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-2 animate-pulse"
        >
          <Trophy className="w-6 h-6" />
          RESGATAR PRÊMIO
          <ArrowRight className="w-6 h-6" />
        </button>

        <p className="text-xs text-green-200 mt-4 opacity-80">
          ✅ Prêmio garantido • Pagamento imediato via PIX
        </p>
      </div>
    </div>
  );
};

export default RouletteScreen;