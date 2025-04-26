import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, KeySquare } from 'lucide-react';
import { auth, db, provider } from '../../config/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) return null;
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(profilePicture);
      });
    } catch (error) {
      console.error('Error uploading profile picture to base 64', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1️⃣ Create the user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2️⃣ Upload profile pic if any
      const profilePictureUrl = await handleProfilePictureUpload();

      // 3️⃣ Firestore: Users collection
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        profilePicture: profilePictureUrl || '',
      });

      // 4️⃣ Firestore: RecentSongs collection (empty for now)
      const recentSongsRef = doc(db, 'RecentSongs', user.uid);
      await setDoc(recentSongsRef, {
        songs: [],
      });

      // 5️⃣ Firestore: SavedSongs collection (empty for now)
      const savedSongsRef = doc(db, 'SavedSongs', user.uid);
      await setDoc(savedSongsRef, {
        songs: [],
      });

      // 6️⃣ Redirect home
      navigate('/home');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please log in or use a different email.');
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      // 1️⃣ Google OAuth
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const profilePictureUrl = user.photoURL || '';

      // 2️⃣ Firestore: Users collection
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        profilePicture: profilePictureUrl,
      });

      // 3️⃣ Firestore: RecentSongs collection
      const recentSongsRef = doc(db, 'RecentSongs', user.uid);
      await setDoc(recentSongsRef, {
        songs: [],
      });

      // 4️⃣ Firestore: SavedSongs collection
      const savedSongsRef = doc(db, 'SavedSongs', user.uid);
      await setDoc(savedSongsRef, {
        songs: [],
      });

      // 5️⃣ Redirect home
      navigate('/home');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-300 via-blue-200 to-cyan-300 opacity-40 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-200 opacity-40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-4xl bg-gradient-to-b from-silver to-gray-100 p-10 rounded-2xl shadow-2xl border border-gray-300 mx-auto relative overflow-hidden">
        <h1 className="text-5xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-black">
          Create an Account
        </h1>
        <p className="text-center text-gray-600 mb-8">Sign up to join us</p>

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

          {/* Profile Picture Upload Field */}
          <div className="relative">
            <label className="block text-gray-600 mb-2">Upload Profile Picture (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files[0])}
              className="block w-full text-sm text-gray-600 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>

          {/* Error Message */}
          {errorMessage && <p className="text-red-500 text-center mb-4">{errorMessage}</p>}

          <button
            type="submit"
            className={`w-full py-3 px-4 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-300 hover:bg-gradient-to-r hover:from-blue-300 hover:to-blue-400'
            } text-white rounded-lg transform transition-all duration-300 ease-in-out 
            hover:scale-105 hover:shadow-xl font-semibold text-lg`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing Up...' : 'Sign Up'}
          </button>


          {/* Google Sign-Up Button */}
<div className="relative">
  <button
    type="button"
    onClick={handleGoogleSignUp}
    className="group w-full py-3 px-4 bg-blue-400 text-white rounded-lg flex items-center justify-center gap-3 border border-blue-400 hover:bg-blue-400 hover:shadow-lg transform transition-all duration-300 ease-in-out 
    hover:bg-gradient-to-r hover:from-blue-300 hover:to-blue-400 hover:scale-105 font-semibold text-lg"
  >
    {/* Replace with a direct URL or properly import assets */}
    <img
      src="https://www.google.com/favicon.ico" // Replace with your Google icon
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
          <a href="#" className="text-gray-700 hover:text-gray-500">Already have an account? Sign In</a>
        </div>
      </div>
    </div>
  );
};

export default SignUp;