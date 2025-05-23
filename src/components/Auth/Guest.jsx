import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Check, X } from 'lucide-react';

const Guest = () => {
  const navigate = useNavigate();

  const confirmGuestLogin = async () => {
    try {
      const { user } = await signInAnonymously(auth);

      await setDoc(doc(db, 'Users', user.uid), {
        email: '',
        profilePicture: '',
        is_guest: true,
      });

      await setDoc(doc(db, 'RecentSongs', user.uid), { songs: [] });
      await setDoc(doc(db, 'SavedSongs', user.uid), { songs: [] });

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
    <div className="h-screen w-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-700 via-blue-900 to-cyan-700 opacity-30 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-700 opacity-25 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Guest Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700 mx-auto relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-white">
          Enter as Guest
        </h1>
        <p className="text-center text-gray-400 mb-8">
          If you enter as a guest, your Recent &amp; Saved songs will be wiped when you log out.
          Continue?
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={confirmGuestLogin}
            className="group flex-1 py-4 px-6 bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-200
                       hover:bg-emerald-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-300/50
                       transition-all duration-300 font-semibold flex items-center justify-center gap-3"
          >
            <Check className="h-6 w-6 text-emerald-500 group-hover:animate-bounce" />
            <span>Yes, Continue</span>
          </button>

          <button
            onClick={declineGuestLogin}
            className="group flex-1 py-4 px-6 bg-red-100 text-red-600 rounded-lg border border-red-200
                       hover:bg-red-200 hover:scale-105 hover:shadow-lg hover:shadow-red-300/50
                       transition-all duration-300 font-semibold flex items-center justify-center gap-3"
          >
            <X className="h-6 w-6 text-red-500 group-hover:animate-bounce" />
            <span>No, Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Guest;