import React, { useState, createContext } from "react";
import { IonToast } from "@ionic/react";
import { Plugins } from '@capacitor/core'; // Import from @capacitor/core

// Access Storage from Plugins
const { Storage } = Plugins;
import Maindata from "../data";
import { setTokens } from "../services/authTokens";
import { api } from "../services/api";
import { getDeviceInfo } from "../services/deviceInfo";
import { uploadProfileImageInChunks } from "../services/profileChunkUpload";
import Swal from 'sweetalert2';
import { showBannedAccountModal, isUserBannedResponse } from "../services/apiClient";
// Create the context
const LoginContext = createContext();

const LoginProvider = (props) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [users, setUsers] = useState([]);
  const [toastMessage, setToastMessage] = useState(""); // For displaying success/error messages

  // Define server hosts and environment
  const serverHost = "https://chatapp-server-lqd9.onrender.com";
  const serverHost2 = "https://chatapp-socket-jxj0.onrender.com";
  const localhost = `https://${Maindata.SERVER_URL}`;
  const localhost2 = "http://192.168.0.197:8001";
  const host = localhost;
  const host2 = localhost2;
  const isDev = Maindata.IsDev;

  // Display toast messages for user feedback
  const showToast = (message) => {
    setToastMessage(message);
  };

  // Signup function
  const signup = async ({
    name,
    email,
    password,
    phoneNumber,
    profilePhoto,
    otpCode,
    accepted_terms,
    accepted_terms_at,
    accepted_terms_version,
  }) => {
  try {
    const deviceInfo = await getDeviceInfo();
    let profileUploadId = null;

    if (profilePhoto) {
      try {
        const uploadResult = await uploadProfileImageInChunks(host, profilePhoto, {
          authenticated: false,
        });
        profileUploadId = uploadResult.uploadId || null;
      } catch (uploadError) {
        console.warn("Profile chunk upload unavailable, falling back to inline signup image", uploadError);
      }
    }

    const payload = {
      username: name,
      email,
      password,
      phoneNumber,
      otpCode,
      image: profileUploadId ? null : (profilePhoto || null), // base64 fallback
      profileUploadId,
      accepted_terms: !!accepted_terms,
      accepted_terms_at,
      accepted_terms_version,
      ...deviceInfo,
    };

    const response = await fetch(`${host}/user/createuser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      showToast(json?.error || 'Signup failed');
      return { success: false, error: json };
    }

    if (json.authtoken) {
      await setTokens({ accessToken: json.authtoken, refreshToken: json.refreshToken });
      setIsAuthenticated(true);

      if (profilePhoto) {
        setProfilePic(profilePhoto); // local UI state only
      }

      showToast('Signup successful!');
      return { success: true, data: json.authtoken, refreshToken: json.refreshToken };
    }

    showToast(json.error || 'Invalid response');
    return { success: false, error: json.error };

  } catch (error) {
    console.error('Error during signup:', error);
    showToast('Error during signup');
    return { success: false, error };
  }
};


  // Get current user
  const getuser = async () => {
    try {
      const response = await api.getUser(host);
      const json = await response.json();
      try {

        if(response.ok && json.success){
       // await Storage.set({ key: 'currentuser', value: JSON.stringify(json) });
       globalThis.storage.setItem('currentuser',JSON.stringify(json.userResponse))
       console.log("this works here ",json.userResponse)

        setCurrentUser(json.userResponse);

        return json.userResponse;
        }else{
          if (isUserBannedResponse(response.status, json)) {
            await showBannedAccountModal(
              json?.error || json?.message || "You have been banned. If you feel this is a mistake, email the devs."
            );
            return false;
          }
          const msg = (json?.error || json?.message || "").toLowerCase();
          const revoked = response.status === 401 || response.status === 403 || msg.includes("revoke") || msg.includes("revocation") || (msg.includes("token") && msg.includes("invalid")) || msg.includes("logout");
          if (revoked) {
            Swal.fire({
              title: 'Session revoked',
              text: json.error || json.message || 'Your session was revoked. Please login again.',
              icon: 'error',
              confirmButtonText: 'OK',
              width: 320,
              padding: '1.2rem',
              backdrop: 'rgba(0,0,0,0.4)',
              customClass: {
                popup: 'mobile-alert'
              }
            });
          }
          return false
        }

        
      } catch (error) {
        console.error("error in saving current user in storage",error)
      }

      
    } catch (error) {
      console.error("Error fetching user:", error);
      showToast("Error fetching user");
      return false;
    }
  };

  // Edit user function
  const editUser = async (formData) => {
    const tokenResult = await Storage.get({ key: 'token' });
    const token = tokenResult.value;
    try {
      const response = await api.editUser(host, formData, { Auth: token });

      const json = await response.json();
      if (json.success) {
        await getuser(token); // Update user after edit
        showToast("User updated successfully!");
        return { success: true };
      } else {
        showToast(json.error);
        return { success: false, error: json.error };
      }
    } catch (error) {
      console.error("Error editing user:", error);
      showToast("Error editing user");
      return { success: false, error };
    }
  };

  // Fetch all users
  const alluser = async () => {
    try {
      const response = await api.allUsers(host, []);
      const json = await response.json();
      setUsers(json);
    } catch (error) {
      console.error("Error fetching all users:", error);
      showToast("Error fetching all users");
    }
  };

  return (
    <LoginContext.Provider value={{ 
      isAuthenticated, setIsAuthenticated, host, signup, editUser, 
      getuser, currentUser, alluser, users, setCurrentUser,
      host2, localhost, localhost2, isDev 
    }}>
      {props.children}

      {/* Toast component for showing success/error messages */}
      <IonToast
        isOpen={toastMessage !== ""}
        message={toastMessage}
        duration={2000}
        onDidDismiss={() => setToastMessage("")}
      />
    </LoginContext.Provider>
  );
};

export { LoginContext, LoginProvider };
