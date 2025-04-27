import { useNavigate } from 'react-router-dom';
import { LogIn, BadgePlus, User } from 'lucide-react';
import { useEffect } from 'react';

const App = () => {
  const navigate = useNavigate();

  // Access your .env keys
  const geminiKey = import.meta.env.VITE_GEMINI_KEY;
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const spotifySecretId = import.meta.env.VITE_SPOTIFY_SECRET_ID;

  useEffect(() => {
    const fetchGeminiData = async () => {
      try {
        const response = await fetch(`https://api.example.com/data?key=${geminiKey}`);
        const data = await response.json();
        console.log('Gemini Data:', data); // REMOVE THIS IN PRODUCTION!
      } catch (error) {
        console.error('Error fetching Gemini data:', error);
      }
    };

    fetchGeminiData();
  }, [geminiKey]);

  const handleLogin = () => navigate('/login');
  const handleSignUp = () => navigate('/signup');
  const handleGuest = () => navigate('/guest');

  return (
    <div className="h-screen w-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-700 via-blue-900 to-cyan-700 opacity-30 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-700 opacity-25 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-gradient-to-b from-gray-900 to-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700 mx-auto relative overflow-hidden">
        {/* Title Section */}
        <h1 className="text-5xl font-extrabold text-center mb-8 text-white">
          Déjà Tune
        </h1>

        {/* Action Buttons Section */}
        <div className="w-full space-y-6 px-4 sm:px-8 relative z-10">
          <button
            onClick={handleLogin}
            className="group w-full py-4 px-6 bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-200
                       hover:bg-emerald-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-300/50
                       transition-all duration-300 font-semibold flex items-center justify-center gap-3"
          >
            <LogIn className="h-6 w-6 text-emerald-500 group-hover:animate-bounce" />
            <span>Log In</span>
          </button>

          <button
            onClick={handleSignUp}
            className="group w-full py-4 px-6 bg-blue-100 text-blue-600 rounded-lg border border-blue-200
                       hover:bg-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-300/50
                       transition-all duration-300 font-semibold flex items-center justify-center gap-3"
          >
            <BadgePlus className="h-6 w-6 text-blue-500 group-hover:animate-bounce" />
            <span>Sign Up</span>
          </button>

          <button
            onClick={handleGuest}
            className="group w-full py-4 px-6 bg-red-100 text-red-600 rounded-lg border border-red-200
                       hover:bg-red-200 hover:scale-105 hover:shadow-lg hover:shadow-red-300/50
                       transition-all duration-300 font-semibold flex items-center justify-center gap-3"
          >
            <User className="h-6 w-6 text-red-500 group-hover:animate-bounce" />
            <span>Join as Guest</span>
          </button>
        </div>

        {/* Footer Section (Optional Content) */}
        <div className="mt-10 text-center text-sm text-gray-400 relative z-10">
          {/* Optional footer */}
        </div>
      </div>
    </div>
  );
};

export default App;