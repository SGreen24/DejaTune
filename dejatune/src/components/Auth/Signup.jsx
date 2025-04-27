// src/pages/SignUp.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, KeySquare } from "lucide-react";
import { auth, db, provider } from "../../config/firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading]       = useState(false);

  const handleProfilePictureUpload = () => {
    if (!profilePicture) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(profilePicture);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (profilePicture && profilePicture.size > 500 * 1024) {
        setErrorMessage("Please upload a smaller image (max 500KB).");
        setIsLoading(false);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const profilePictureUrl = await handleProfilePictureUpload();

      await setDoc(doc(db, "Users", user.uid), {
        email: user.email,
        profilePicture: profilePictureUrl || ""
      });
      await setDoc(doc(db, "RecentSongs", user.uid), { songs: [] });
      await setDoc(doc(db, "SavedSongs", user.uid), { songs: [] });

      navigate("/home");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("This email is already registered. Please log in or use a different email.");
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
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await setDoc(doc(db, "Users", user.uid), {
        email: user.email,
        profilePicture: user.photoURL || ""
      });
      await setDoc(doc(db, "RecentSongs", user.uid), { songs: [] });
      await setDoc(doc(db, "SavedSongs", user.uid), { songs: [] });
      navigate("/home");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-300 via-blue-200 to-cyan-300 opacity-40 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-200 opacity-40 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-gray-100 to-gray-200 p-10 rounded-2xl shadow-2xl border border-gray-300 mx-auto relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800">
          Create an Account
        </h1>
        <p className="text-center text-gray-600 mb-8">Sign up to join us</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400
                         text-gray-700 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <KeySquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400
                         text-gray-700 transition-colors"
            />
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-gray-700 mb-2">Profile Picture (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setProfilePicture(e.target.files[0])}
              className="w-full text-gray-700 bg-white border border-gray-300 rounded-lg
                         cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMessage && (
            <p className="text-red-600 text-center">{errorMessage}</p>
          )}

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 text-lg font-semibold rounded-lg shadow-lg transform transition-all duration-300
                       ${isLoading
                         ? "bg-gray-300 cursor-not-allowed text-gray-500"
                         : "bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200 hover:scale-105 hover:shadow-blue-300/50"
                       }`}
          >
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className={`group w-full py-3 text-lg font-semibold rounded-lg shadow-lg flex items-center justify-center gap-3 transform transition-all duration-300
                       ${isLoading
                         ? "bg-gray-300 cursor-not-allowed text-gray-500"
                         : "bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 hover:shadow-emerald-300/50"
                       }`}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="h-6 w-6 group-hover:animate-bounce transition-transform"
            />
            <span>Continue with Google</span>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <a href="#" className="hover:text-gray-800">Forgot password?</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-gray-800">Already have an account? Log In</a>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
