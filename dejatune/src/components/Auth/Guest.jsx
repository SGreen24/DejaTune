// src/pages/Guest.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const Guest = () => {
  const navigate = useNavigate();

  const confirmGuestLogin = async () => {
    try {
      // 1️⃣ Sign in anonymously
      const { user } = await signInAnonymously(auth);

      // 2️⃣ Create minimal guest user record
      await setDoc(doc(db, 'Users', user.uid), {
        email: '',
        profilePicture: '',
        is_guest: true,
      });

      // 3️⃣ Initialize RecentSongs & SavedSongs
      await setDoc(doc(db, 'RecentSongs', user.uid), { songs: [] });
      await setDoc(doc(db, 'SavedSongs', user.uid), { songs: [] });

      // 4️⃣ Navigate home
      navigate('/home', { state: { userId: user.uid } });
    } catch (error) {
      console.error('Error creating guest user:', error);
      alert('Failed to sign in as guest. Please try again.');
    }
  };

  const declineGuestLogin = () => {
    navigate('/');
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-700 via-blue-900 to-cyan-700 opacity-30 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-700 opacity-25 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Guest Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 p-10 rounded-2xl shadow-2xl border border-gray-700 mx-auto relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Enter as Guest
        </h1>
        <p className="text-center text-gray-400 mb-8">
          If you enter as a guest, your Recent &amp; Saved songs will be wiped when you log out.
          Continue?
        </p>

        <div className="flex gap-4">
          <button
            onClick={confirmGuestLogin}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold text-lg shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            Yes, Continue
          </button>
          <button
            onClick={declineGuestLogin}
            className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold text-lg shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            No, Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Guest;
