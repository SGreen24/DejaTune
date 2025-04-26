import { useState, useEffect } from "react";
import { auth, db } from "../../config/firebase"
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import UserSettings from "./UserSettings";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestMessage, setGuestMessage] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userRef = doc(db, "Users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsGuest(data.is_guest || false);
            if (data.profilePicture) {
              setProfilePicture(data.profilePicture);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        if (userData.is_guest) {
          const articlesCollectionRef = collection(db, "Articles");
          const q = query(articlesCollectionRef, where("scrape_author", "==", user.uid));
          const querySnapshot = await getDocs(q);

          const deletePromises = querySnapshot.docs.map((docSnap) =>
            deleteDoc(doc(db, "Articles", docSnap.id)),
          );
          await Promise.all(deletePromises);

          await deleteDoc(userRef);
        }
      }

      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error during guest sign-out:", error);
    }
  };

  const handleGuestClick = () => {
    setGuestMessage("Please Login to Access Profile");
    setTimeout(() => setGuestMessage(""), 4000);
  };

  return (
    <div className="relative">
      <div
        className="w-12 h-12 rounded-full overflow-hidden cursor-pointer border border-gray-300 flex items-center justify-center bg-black text-white font-bold"
        onClick={toggleDropdown}
      >
        {profilePicture ? (
          <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span>{user?.email?.charAt(0).toUpperCase() || "U"}</span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 shadow-lg rounded-lg p-4">
          <h3 className="font-bold text-lg mb-2 text-white">Hello :)</h3>

          <div className="relative">
            <button
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg mb-2"
              onClick={() => {
                if (isGuest) {
                  handleGuestClick();
                } else {
                  setShowDropdown(false);
                  setShowSettings(true);
                }
              }}
            >
              Settings
            </button>

            {guestMessage && (
              <div className="absolute left-0 mt-1 text-sm text-red-500 bg-gray-900 p-2 rounded-lg">
                {guestMessage}
              </div>
            )}
          </div>

          <button
            className="w-full py-2 px-4 bg-red-500 text-white rounded-lg mt-2"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      {showSettings && (
        <UserSettings
          user={user}
          onLogout={handleLogout}
          onClose={() => {
            setShowSettings(false);
            setShowDropdown(true);
          }}
        />
      )}
    </div>
  );
};

export default Profile;
