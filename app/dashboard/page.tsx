'use client';

import { supabase } from '@/lib/supabase';
import { Gamepad2 } from 'lucide-react';

export default function LoginPage() {
  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <Gamepad2 className="w-16 h-16 text-indigo-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Wind Rose Studios</h1>
        <p className="text-gray-400 mb-8">Painel Interno de Gestão</p>
        
        <button 
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-3"
        >
          <img src="/discord-icon.svg" alt="Discord" className="w-5 h-5" />
          Entrar com Discord
        </button>
      </div>
    </div>
  );
}
