import { useState, useRef, useEffect } from 'react';
import { updatePassword, deleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const PasswordChangeManager = ({ user, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setErrorMessage('Passwords do not match. Please try again.');
            return;
        }

        try {
            await updatePassword(user, newPassword);
            setSuccessMessage('Password updated successfully.');
            setTimeout(onClose, 2000);  // Auto-close after 2 seconds
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 shadow-lg rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-white">Password Change Manager</h3>

            {/* New Password Input */}
            <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg mb-2"
            />

            {/* Confirm Password Input */}
            <input
                type="password"
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg mb-2"
            />

            {/* Error/Success Messages */}
            {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}

            {/* Confirm Button */}
            <button
                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg mb-2"
                onClick={handlePasswordChange}
            >
                Confirm
            </button>

            {/* Cancel Button */}
            <button
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg"
                onClick={onClose}
            >
                Cancel
            </button>
        </div>
    );
};

const UserSettings = ({ user, onClose, onLogout }) => {
    const [profilePicture, setProfilePicture] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPasswordManager, setShowPasswordManager] = useState(false);
    const fileInputRef = useRef();
    const [showNoUserMessage, setShowNoUserMessage] = useState(false);

    const showUserMessage = () => {
        setShowNoUserMessage(true);
        setTimeout(() => setShowNoUserMessage(false), 5000); // Automatically hide message after 5 seconds
    };

    const handleProfilePictureButtonClick = () => {
        fileInputRef.current.click();
    };


    useEffect(() => {
        const fetchProfilePicture = async () => {
            try {
                const userRef = doc(db, 'Users', user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfilePicture(data.profilePicture || null);  // Set initial profile picture
                }
            } catch (error) {
                console.error('Error fetching profile picture:', error);
            }
        };
    
        if (user) {
            fetchProfilePicture();
        }
    }, [user]);

   

    // Convert selected file to Base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleChangeProfilePicture = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) return;
      
          // 🚫 File size check (500KB limit)
          if (file.size > 500 * 1024) {
            setErrorMessage("Please upload a smaller image (max 500KB).");
            return;
          }
      
          console.log('Uploading for user:', user);
          console.log('Selected file:', file);
      
          const base64Picture = await convertFileToBase64(file);
          console.log('Base64 length:', base64Picture.length);
      
          if (!user || !user.uid) {
            console.error('User not valid:', user);
            setErrorMessage('Invalid user session.');
            return;
          }
      
          const userRef = doc(db, 'Users', user.uid);
          await updateDoc(userRef, { profilePicture: base64Picture });
          console.log('Firestore updated successfully.');
      
          const updatedUserDoc = await getDoc(userRef);
          if (updatedUserDoc.exists()) {
            const updatedData = updatedUserDoc.data();
            console.log('Updated user data:', updatedData);
            setProfilePicture(updatedData.profilePicture);
          }
      
          setProfilePicture(base64Picture);
          setSuccessMessage('Profile picture updated successfully.');
        } catch (error) {
          console.error('Error updating profile picture:', error);
          setErrorMessage('Error updating profile picture.');
        }
      };
      

    // Handle account deletion
    const handleDeleteAccount = async () => {
        try {
            if (user) {
                const confirmDelete = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
                if (confirmDelete) {
                    const userRef = doc(db, 'Users', user.uid);
                    await deleteDoc(userRef);
                    await deleteUser(user);
                    setSuccessMessage('Account deleted successfully.');
                    onLogout();  // Close the settings window after deletion
                }
            }
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    if (!user) {
        if (!showNoUserMessage) {
            showUserMessage(); // Trigger message display each time condition is met
        }
    
        return (
            showNoUserMessage && (
                <p id="no-user-message" className="text-white">No user data available.</p>
            )
        );
    }
    

    return (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 shadow-lg rounded-lg p-4">
            {showPasswordManager ? (
                <PasswordChangeManager
                    user={user}
                    onClose={() => setShowPasswordManager(false)}
                />
            ) : (
                <>
            <h3 className="font-bold text-lg mb-2 text-white">Settings</h3>

            {/* Profile Picture Preview */}
            {profilePicture && (
                <img
                    src={profilePicture}
                    alt="Profile Preview"
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
                />
            )}

            {/* Change Profile Picture */}
            <button
                className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg mb-2"
                onClick={handleProfilePictureButtonClick}
                
            >
                Change Profile Picture
            </button>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChangeProfilePicture}
                className="hidden"
            />

            

            {/* Change Password */}
            <button
                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg mb-2"
                onClick={() => setShowPasswordManager(true)}
            >
                Change Password
            </button>

            {/* Delete Account */}
            <button
                className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg"
                onClick={handleDeleteAccount}
            >
                Delete Account
            </button>

            {/* Close Modal Button */}
            <button
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg mt-4"
                onClick={onClose}
            >
                Close
            </button>

            {/* Error/Success Messages */}
            {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
            </>
            )}
        </div>
    );
};

export default UserSettings; 