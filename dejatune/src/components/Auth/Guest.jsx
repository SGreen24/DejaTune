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
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, {
        email: '',
        profilePicture: '',
        is_guest: true,
      });

      // 3️⃣ Initialize RecentSongs list
      const recentRef = doc(db, 'RecentSongs', user.uid);
      await setDoc(recentRef, { songs: [] });

      // 4️⃣ Initialize SavedSongs list
      const savedRef = doc(db, 'SavedSongs', user.uid);
      await setDoc(savedRef, { songs: [] });

      // 5️⃣ Go to home
      navigate('/home', { state: { userId: user.uid } });
    } catch (error) {
      console.error('Error creating guest user in Firestore:', error);
      alert('Failed to sign in as guest. Please try again.');
    }
  };

  const declineGuestLogin = () => {
    navigate('/');
  };

  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center relative overflow-hidden">
      {/* Background animations */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-300 via-blue-200 to-cyan-300 opacity-40 rounded-full blur-3xl animate-pulse"/>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-200 opacity-40 rounded-full blur-3xl animate-blob animation-delay-2000"/>

      <div className="w-full max-w-4xl bg-gradient-to-b from-silver to-gray-100 p-10 rounded-2xl shadow-2xl border border-gray-300 mx-auto relative overflow-hidden">
        <h1 className="text-5xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-black">
          Enter as Guest
        </h1>
        <p className="text-center text-gray-600 mb-8">
          If you enter as a guest, your Recent &amp; Saved songs will be wiped when you log out.
          Continue?
        </p>

        <div className="flex justify-center gap-4">
          <button 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={confirmGuestLogin}
          >
            Yes
          </button>
          <button 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={declineGuestLogin}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default Guest;
