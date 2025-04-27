// src/App.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, BadgePlus, User } from 'lucide-react';

const App = () => {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/login');
  const handleSignUp = () => navigate('/signup');
  const handleGuest = () => navigate('/guest');

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center relative overflow-hidden">
      {/* Pulsing Background Lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-700 via-blue-900 to-cyan-700 opacity-30 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-700 opacity-25 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-gradient-to-b from-gray-800 to-gray-900 p-10 rounded-2xl shadow-2xl border border-gray-700 mx-auto relative overflow-hidden">
        {/* Title */}
        <h1 className="text-5xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Déjà Tune
        </h1>

        {/* Action Buttons */}
        <div className="w-full space-y-6 px-4 sm:px-8">
          {[
            { onClick: handleLogin, Icon: LogIn, label: 'Log In' },
            { onClick: handleSignUp, Icon: BadgePlus, label: 'Sign Up' },
            { onClick: handleGuest, Icon: User, label: 'Join as Guest' },
          ].map(({ onClick, Icon, label }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full py-4 px-6 bg-gray-800 text-purple-300 rounded-lg border border-gray-700
                         hover:bg-gray-700 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50
                         transition-transform duration-300 font-semibold flex items-center justify-center gap-3"
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
