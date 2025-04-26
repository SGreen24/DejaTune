import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, KeySquare } from 'lucide-react';
import { auth, db } from '../../config/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const provider = new GoogleAuthProvider();

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const ensureUserCollections = async (uid) => {
    // RecentSongs
    const recentRef = doc(db, 'RecentSongs', uid);
    if (!(await getDoc(recentRef)).exists()) {
      await setDoc(recentRef, { songs: [] });
    }

    // SavedSongs
    const savedRef = doc(db, 'SavedSongs', uid);
    if (!(await getDoc(savedRef)).exists()) {
      await setDoc(savedRef, { songs: [] });
    }
  };

  const handleLogin = async () => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Confirm user record exists
      const userRef = doc(db, 'Users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setErrorMessage("User not found in database.");
        return;
      }

      // Ensure RecentSongs & SavedSongs exist
      await ensureUserCollections(user.uid);

      navigate('/home');
    } catch (error) {
      switch (error.code) {
        case 'auth/invalid-email':
          setErrorMessage("Invalid email address.");
          break;
        case 'auth/wrong-password':
          setErrorMessage("Incorrect password.");
          break;
        case 'auth/user-not-found':
          setErrorMessage("No account found with this email.");
          break;
        default:
          setErrorMessage(error.message || "Login failed. Please try again.");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Confirm user record exists
      const userRef = doc(db, 'Users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setErrorMessage("User not found in database.");
        return;
      }

      // Ensure RecentSongs & SavedSongs exist
      await ensureUserCollections(user.uid);

      navigate('/home');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center relative overflow-hidden">
      <div className="w-full max-w-4xl bg-gradient-to-b from-silver to-gray-100 p-10 rounded-2xl shadow-2xl border border-gray-300 mx-auto relative overflow-hidden">
        <h1 className="text-5xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-black">Log In</h1>
        <p className="text-center text-gray-600 mb-8">Welcome Back!</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-all" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all text-lg placeholder:text-gray-400 font-bold text-black"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password Field */}
          <div className="relative group">
            <KeySquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-all" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all text-lg placeholder:text-gray-400 font-bold text-black"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error Message */}
          {errorMessage && <p className="text-red-500 text-center mb-4">{errorMessage}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gray-300 text-white rounded-lg transform transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-green-300 hover:to-green-400 hover:scale-105 hover:shadow-xl font-semibold text-lg"
          >
            Log In
          </button>

          {/* Google Login Button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="group w-full py-3 px-4 bg-green-400 text-white rounded-lg flex items-center justify-center gap-3 border border-black-400 hover:shadow-lg transform transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-green-300 hover:to-green-400 hover:scale-105 font-semibold text-lg"
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google Logo"
                className="h-6 w-6 group-hover:animate-spin transition-transform"
              />
              <span>Continue with Google</span>
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <a href="#" className="text-gray-700 hover:text-gray-500">Forgot password?</a>
          <span className="mx-2">•</span>
          <a href="#" className="text-gray-700 hover:text-gray-500">Don&apos;t have an account? Sign Up</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
