import React, { useState, useEffect, useContext } from 'react';
import { IonAlert, isPlatform } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { LoginContext } from '../Contexts/UserContext';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF } from 'react-icons/fa';
import { HiOutlineArrowNarrowRight } from 'react-icons/hi';
import { IoFlash } from 'react-icons/io5';
import PropTypes from "prop-types";
import StarLoader from '../pages/StarLoader';
import Maindata from '../data';
import { getAccessToken, setTokens, clearTokens } from "../services/authTokens";
import { showBannedAccountModal } from "../services/apiClient";
import { isTemporaryRuntime } from "../services/temporarySession";
import { api } from "../services/api";
import { createEncryptedKeyPair, decryptPrivateKeyWithPassword, encryptPrivateKeyWithPassword } from "../services/privateKeyVault";
import { hashPrivateKey } from "../services/keyHash";
import Swal from 'sweetalert2';
import { getDeviceInfo } from "../services/deviceInfo";
import "./LoginScreen.css";

const getSocketClientType = () => (isPlatform('hybrid') || isPlatform('ios') || isPlatform('android') ? "native" : "web");

const LoginForm = ({ sendPublicKeyToBackend, connect }) => {
  const history = useHistory();
  const location = useLocation();
  const { host, getuser } = useContext(LoginContext);
  const [loginlaod, setloginlaod] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const { message } = location.state || {};
  const isNative = isPlatform('hybrid') || isPlatform('ios') || isPlatform('android');

  useEffect(() => {
    if (message) {
      setAlertMessage(message);
      setShowAlert(true);
    }
  }, [message]);

  useEffect(() => {
    const checkToken = async () => {
      setloginlaod(true);
      const token = await getAccessToken();
      if (token) {
        history.push(isTemporaryRuntime() ? '/temporaryhome' : '/home');
        setloginlaod(false);
        return;
      }
      setloginlaod(false);
    };
    checkToken();
  }, [history]);

  const ensureSQLiteReady = async () => {
    if (!isPlatform('hybrid')) return;
    if (!window.sqlitePlugin?.openDatabase) return;

    await new Promise((resolve, reject) => {
      const db = window.sqlitePlugin.openDatabase(
        { name: 'Conversa_chats_store.db', location: 'default' },
        () => resolve(true),
        (err) => reject(err)
      );

      db.transaction(
        (tx) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              sender TEXT,
              recipient TEXT,
              content TEXT,
              timestamp TEXT,
              status TEXT,
              read INTEGER DEFAULT 0,
              isDeleted INTEGER DEFAULT 0,
              isDownload INTEGER DEFAULT 0,
              type TEXT DEFAULT 'text',
              file_name TEXT,
              file_type TEXT DEFAULT null,
              file_size INTEGER,
              thumbnail BLOB DEFAULT null,
              file_path TEXT,
              isError INTEGER DEFAULT 0,
              isSent INTEGER DEFAULT 1,
              encryptedMessage TEXT DEFAULT null,
              encryptedAESKey TEXT DEFAULT null,
              eniv TEXT DEFAULT null,
              isReplyTo TEXT DEFAULT null
            );`
          );
          tx.executeSql(
            `ALTER TABLE messages ADD COLUMN isReplyTo TEXT DEFAULT null;`,
            [],
            () => {},
            () => false
          );
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS unreadCount (
              sender TEXT PRIMARY KEY,
              count INTEGER DEFAULT 0
            );`
          );
        },
        (err) => reject(err),
        () => resolve(true)
      );
    });
  };

  const isEncryptedPrivateKeyPayload = (value) => {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed?.v && parsed?.salt && parsed?.iv && parsed?.ciphertext);
    } catch {
      return false;
    }
  };

  const clearKeySessionAndThrow = async (message) => {
    globalThis.storage.removeItem("currentuser");
    globalThis.storage.removeItem("privateKey");
    await clearTokens();
    throw new Error(message);
  };

  const restorePrivateKeyForLogin = async (loginResponse) => {
    const serverUser = loginResponse?.userResponse || null;
    const encryptedPrivateKey = loginResponse?.privateKeyHash || serverUser?.privateKeyHash || "";
    const serverFingerprint = loginResponse?.privateKeyFingerprint || serverUser?.privateKeyFingerprint || "";

    if (serverUser) {
      globalThis.storage.setItem("currentuser", JSON.stringify(serverUser));
    }

    if (encryptedPrivateKey && isEncryptedPrivateKeyPayload(encryptedPrivateKey)) {
      try {
        const privateKey = await decryptPrivateKeyWithPassword(encryptedPrivateKey, password);
        const localFingerprint = await hashPrivateKey(privateKey);
        if (serverFingerprint && serverFingerprint !== localFingerprint) {
          await clearKeySessionAndThrow("Private key changed. Please login again.");
        }
        globalThis.storage.setItem("privateKey", privateKey);
        if (!serverFingerprint && serverUser?.publicKey) {
          const updateResponse = await api.updateKey(host, serverUser.publicKey, encryptedPrivateKey, localFingerprint);
          const updateJson = await updateResponse.json().catch(() => ({}));
          if (updateResponse.ok && updateJson.success) {
            const updatedUser = { ...serverUser, privateKeyFingerprint: localFingerprint };
            globalThis.storage.setItem("currentuser", JSON.stringify(updatedUser));
          }
        }
        return;
      } catch (error) {
        if (error?.message === "Private key changed. Please login again.") {
          throw error;
        }
        console.warn("Stored private key could not be decrypted.", error);
        await clearKeySessionAndThrow("Private key could not be decrypted. Please login again.");
      }
    }

    if (encryptedPrivateKey && !isEncryptedPrivateKeyPayload(encryptedPrivateKey)) {
      const localPrivateKey = globalThis.storage.getItem("privateKey");
      if (!localPrivateKey || !serverUser?.publicKey) {
        console.warn("Old key format found without a recoverable local private key. Rotating key pair for this account.");
        const keyBundle = await createEncryptedKeyPair(password);
        const privateKeyFingerprint = await hashPrivateKey(keyBundle.privateKey);
        const updateResponse = await api.updateKey(host, keyBundle.publicKey, keyBundle.privateKeyHash, privateKeyFingerprint);
        const updateJson = await updateResponse.json().catch(() => ({}));
        if (!updateResponse.ok || !updateJson.success) {
          throw new Error(updateJson.error || updateJson.message || "Failed to rotate private key storage.");
        }

        const rotatedUser = {
          ...serverUser,
          publicKey: keyBundle.publicKey,
          privateKeyHash: keyBundle.privateKeyHash,
          privateKeyFingerprint,
        };
        globalThis.storage.setItem("currentuser", JSON.stringify(rotatedUser));
        globalThis.storage.setItem("privateKey", keyBundle.privateKey);
        return;
      }

      const localFingerprint = await hashPrivateKey(localPrivateKey);
      if (encryptedPrivateKey !== localFingerprint && serverFingerprint !== localFingerprint) {
        await clearKeySessionAndThrow("Private key changed. Please login again.");
      }

      const upgradedEncryptedPrivateKey = await encryptPrivateKeyWithPassword(localPrivateKey, password);
      const updateResponse = await api.updateKey(host, serverUser.publicKey, upgradedEncryptedPrivateKey, localFingerprint);
      const updateJson = await updateResponse.json().catch(() => ({}));
      if (!updateResponse.ok || !updateJson.success) {
        throw new Error(updateJson.error || updateJson.message || "Failed to upgrade private key storage.");
      }

      const upgradedUser = {
        ...serverUser,
        privateKeyHash: upgradedEncryptedPrivateKey,
        privateKeyFingerprint: localFingerprint,
      };
      globalThis.storage.setItem("currentuser", JSON.stringify(upgradedUser));
      globalThis.storage.setItem("privateKey", localPrivateKey);
      return;
    }

    const keyBundle = await createEncryptedKeyPair(password);
    const privateKeyFingerprint = await hashPrivateKey(keyBundle.privateKey);
    const updateResponse = await api.updateKey(host, keyBundle.publicKey, keyBundle.privateKeyHash, privateKeyFingerprint);
    const updateJson = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok || !updateJson.success) {
      throw new Error(updateJson.error || updateJson.message || "Failed to store encrypted private key.");
    }

    globalThis.storage.setItem("privateKey", keyBundle.privateKey);
    const currentUserStr = globalThis.storage.getItem("currentuser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : serverUser;
    if (currentUser) {
      currentUser.publicKey = keyBundle.publicKey;
      currentUser.privateKeyHash = keyBundle.privateKeyHash;
      currentUser.privateKeyFingerprint = privateKeyFingerprint;
      globalThis.storage.setItem("currentuser", JSON.stringify(currentUser));
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setAlertMessage('Please enter both username and password.');
      setShowAlert(true);
      return;
    }
    setloginlaod(true);

    try {
      const deviceInfo = await getDeviceInfo();
      const response = await fetch(`${host}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password, ...deviceInfo }),
      });

      const json = await response.json();

      if (json.success) {
        await setTokens({ accessToken: json.authtoken, refreshToken: json.refreshToken });
        await restorePrivateKeyForLogin(json);

        const user = globalThis.storage.getItem('currentuser');
        if (!user) {
          await getuser();
        }
        await ensureSQLiteReady();
        const deviceId = (await getDeviceInfo()).deviceId;
        const wsUrl = `wss://${Maindata.SERVER_URL}?token=${json.authtoken}&deviceId=${encodeURIComponent(deviceId)}&clientType=${getSocketClientType()}`;
        await connect(wsUrl);
        await sendPublicKeyToBackend(json.authtoken, password);
        history.push('/home');
      } else {
        const rawMessage = json?.error || json?.message || "";
        const msg = rawMessage.toLowerCase();
        const banned = msg.includes("banned");
        const revoked = response.status === 401 || response.status === 403 || msg.includes("revoke") || msg.includes("revocation") || (msg.includes("token") && msg.includes("invalid")) || msg.includes("logout");
        if (banned) {
          await showBannedAccountModal(
            rawMessage || 'You have been banned. If you feel this is a mistake, email the devs.'
          );
        } else if (revoked) {
          const existingToken = await getAccessToken();
          if (existingToken) {
            Swal.fire({
              title: 'Login blocked',
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
            await clearTokens();
          }
        } else {
          setAlertMessage('Invalid credentials');
          setShowAlert(true);
        }
      }
      setloginlaod(false);
    } catch (error) {
      console.error(error);
      setAlertMessage(error?.message || 'An error occurred. Please try again.');
      setShowAlert(true);
      setloginlaod(false);
    }
  };

  if (loginlaod) {
    return (
      <div className="login-screen-loader">
        <StarLoader />
      </div>
    );
  }

  return (
    <div className={`login-screen ${isNative ? "is-native" : "is-web"}`}>
      <div className="login-screen-grid" />
      <div className="login-screen-shell">
        {!isNative ? (
          <div className="login-web-brandbar">
            <span>ECHOID</span>
            <button type="button" className="login-help-dot" aria-label="Help">?</button>
          </div>
        ) : null}

        <div className="login-screen-content">
          <section className="login-screen-brand-panel">
            <div className="login-brand-mark">ECHOID</div>
            <div className="login-brand-subtitle">DIGITAL PULSE SYNCHRONIZATION</div>
          </section>

          <section className="login-screen-main-panel">
            {!isNative ? (
              <div className="login-web-copy">
                <h1>Welcome Back</h1>
                <p>Enter your credentials to sync with the pulse.</p>
              </div>
            ) : null}

            <div className="login-card">
              <label className="login-label" htmlFor="username">Email address</label>
              <input
                id="username"
                type="text"
                className="login-input"
                placeholder="name@domain.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />

              <div className="login-password-row">
                <label className="login-label" htmlFor="password">Password</label>
                {!isNative ? (
                  <button type="button" className="login-forgot-btn">
                    Forgot?
                  </button>
                ) : null}
              </div>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <button type="button" className="login-submit-btn" onClick={handleLogin}>
                Login
              </button>

              {isNative ? (
                <div className="login-signup-inline">
                  <span>Don&apos;t have an account?</span>
                  <button type="button" className="login-signup-link" onClick={() => history.push('/signup')}>
                    Signup
                  </button>
                </div>
              ) : null}

              {isNative ? (
                <button type="button" className="login-forgot-link-mobile">
                  Forgot Password?
                </button>
              ) : (
                <div className="login-divider">
                  <span>OR CONTINUE WITH</span>
                </div>
              )}

              <div className="login-social-row">
                <button type="button" className="login-social-btn">
                  <FcGoogle size={16} />
                  <span>Google</span>
                </button>
                <button type="button" className="login-social-btn">
                  <FaFacebookF size={13} />
                  <span>Facebook</span>
                </button>
              </div>
            </div>

            <button type="button" className="login-guest-card" onClick={() => history.push('/temporary-setup')}>
              <span className="login-guest-icon">
                <IoFlash size={14} />
              </span>
              <span className="login-guest-copy">
                <small>{isNative ? "Don’t want to create an account yet?" : "QUICK ACCESS"}</small>
                <strong>{isNative ? "Continue without account" : "Continue without account"}</strong>
              </span>
              {!isNative ? <HiOutlineArrowNarrowRight size={20} className="login-guest-arrow" /> : null}
            </button>

            {!isNative ? (
              <div className="login-web-footer-links">
                <span>PRIVACY PROTOCOL</span>
                <span>TERMS OF SERVICE</span>
                <span>SYSTEM STATUS</span>
              </div>
            ) : (
              <div className="login-native-footer">
                <div className="login-native-pulse" />
                <div className="login-native-copyright">© 2024 ECHOID NEXUS SYSTEMS</div>
              </div>
            )}
          </section>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Login Error"
          message={alertMessage}
          buttons={['OK']}
        />
      </div>
    </div>
  );
};

export default LoginForm;

LoginForm.propTypes = {
  sendPublicKeyToBackend: PropTypes.func,
  connect: PropTypes.func,
};
