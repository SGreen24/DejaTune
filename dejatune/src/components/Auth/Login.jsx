// src/pages/Login.jsx
import React, { useState } from 'react';
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
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const ensureUserCollections = async (uid) => {
    const recentRef = doc(db, 'RecentSongs', uid);
    if (!(await getDoc(recentRef)).exists()) {
      await setDoc(recentRef, { songs: [] });
    }
    const savedRef = doc(db, 'SavedSongs', uid);
    if (!(await getDoc(savedRef)).exists()) {
      await setDoc(savedRef, { songs: [] });
    }
  };

  const handleLogin = async () => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'Users', user.uid);
      if (!(await getDoc(userRef)).exists()) {
        setErrorMessage("User not found in database.");
        return;
      }
      await ensureUserCollections(user.uid);
      navigate('/home');
    } catch (error) {
      switch (error.code) {
        case 'auth/invalid-email':
          setErrorMessage("Invalid email address."); break;
        case 'auth/wrong-password':
          setErrorMessage("Incorrect password."); break;
        case 'auth/user-not-found':
          setErrorMessage("No account found with this email."); break;
        default:
          setErrorMessage(error.message || "Login failed. Please try again.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, 'Users', user.uid);
      if (!(await getDoc(userRef)).exists()) {
        setErrorMessage("User not found in database.");
        return;
      }
      await ensureUserCollections(user.uid);
      navigate('/home');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-700 via-blue-900 to-cyan-700 opacity-30 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-700 opacity-25 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 p-10 rounded-2xl shadow-2xl border border-gray-700 mx-auto relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Log In
        </h1>
        <p className="text-center text-gray-400 mb-8">Welcome Back!</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-200 transition-colors" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 text-white transition-colors"
            />
          </div>

          <div className="relative group">
            <KeySquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-200 transition-colors" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 text-white transition-colors"
            />
          </div>

          {errorMessage && (
            <p className="text-red-400 text-center">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold text-lg shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            Log In
          </button>

          <button
  type="button"
  onClick={handleGoogleLogin}
  className="group w-full py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold text-lg shadow-lg flex items-center justify-center gap-3 transform transition-all duration-300 hover:scale-105"
>
  <img
    src="https://www.google.com/favicon.ico"
    alt="Google"
    className="h-6 w-6 group-hover:animate-spin transition-transform"
  />
  <span>Continue with Google</span>
</button>

        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <a href="#" className="hover:text-gray-300">Forgot password?</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-gray-300">Don’t have an account? Sign Up</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
