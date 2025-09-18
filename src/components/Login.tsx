import React from 'react';
import { supabase } from '../utils/supabaseClient';  // 파일명 변경

const Login: React.FC = () => {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <button
        onClick={handleGoogleLogin}
        className="bg-white border border-gray-300 px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-50"
      >
        <img 
          src="https://www.google.com/favicon.ico" 
          alt="Google" 
          className="w-5 h-5"
        />
        구글로 로그인
      </button>
    </div>
  );
};

export default Login;