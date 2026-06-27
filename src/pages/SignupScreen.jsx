import { useState, useContext, useEffect } from 'react';
import { useHistory } from 'react-router';
import { LoginContext } from '../Contexts/UserContext';
import { IonSpinner, IonAlert, isPlatform } from '@ionic/react';
import StarLoader from '../pages/StarLoader';
import data from '../data';
import { setTokens } from "../services/authTokens";
import { getDeviceInfo } from "../services/deviceInfo";
import { createEncryptedKeyPair } from "../services/privateKeyVault";
import { hashPrivateKey } from "../services/keyHash";
import UserInformationStep from '../components/UserInformationStep';
import OTPVerificationStep from '../components/OTPVerificationStep';
import "./LoginScreen.css"; // Reuse login styles

const getSocketClientType = () => (isPlatform('hybrid') || isPlatform('ios') || isPlatform('android') ? "native" : "web");

const SignupForm = ({ sendPublicKeyToBackend, connect }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    countryCode: '+91',
    profileImage: null,
    acceptedTerms: false,
    acctepuse: false
  });
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoad, setIsLoad] = useState(false);
  const [otp, setOtp] = useState('');
  const history = useHistory();
  const { signup, host, getuser } = useContext(LoginContext);
  const defaultCountryCode = '+91';
  const [otpRequestTime, setOtpRequestTime] = useState(null);
  const [serverOnline, setServerOnline] = useState(false);

  const isNative = isPlatform('hybrid') || isPlatform('ios') || isPlatform('android');

  useEffect(() => {
    let cancelled = false;
    const checkServerStatus = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${host}/user/version`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!cancelled) setServerOnline(response.ok);
      } catch {
        if (!cancelled) setServerOnline(false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };
    checkServerStatus();
    const statusInterval = window.setInterval(checkServerStatus, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(statusInterval);
    };
  }, [host]);


  useEffect(() => {
    setTimeout(() => {
      setShowAlert(false);
    }, 5000)
  }, [alertMessage, showAlert])
  const handleNext = (info) => {
    setUserInfo(info);
    console.log(info)
    const requestTime = Date.now();
    globalThis.storage.setItem('otpRequestTime', requestTime.toString());
    setOtpRequestTime(requestTime); // <- update the state
    sendOtp(info.phone, info.countryCode || defaultCountryCode, info);
    setCurrentStep(2);
  };


  const sendOtp = async (number, countryCode, info) => {

    const fullPhoneNumber = `${countryCode}${number}`;
    const response = await fetch(`${host}/user/sendotp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
    });
    const json = await response.json();
    console.log('Response from OTP API:', json);

    if (!json.success && json.otp) {
      setAlertMessage('❌ Failed to send OTP due to low balance sorry (poor guy me). this is the otp' + json.otp);
      handleVerifyOTP(json.otp, info)
      setShowAlert(true);

      return;
    } else if (!json.success) {
      setAlertMessage(json.message || '❌ Failed to send OTP. Please try again.');
      setShowAlert(true);
      return;
    } else {
      setAlertMessage(`OTP sent to ${fullPhoneNumber}`);
      setShowAlert(true);
      setCurrentStep(4);
    }
  };
  const handleback = () => {
    setCurrentStep(1);
  };

  const handleResendOtp = () => {
    const lastSent = parseInt(globalThis.storage.getItem('lastOtpRequestTime') || '0');
    const now = Date.now();
    const interval = 120 * 1000; // 2 minutes

    if (now - lastSent >= interval) {
      sendOtp(phone); // your OTP sending logic
      globalThis.storage.setItem('lastOtpRequestTime', now.toString());
      setResendAvailableAt(now + interval); // optional for UI
    } else {
      const waitTime = Math.ceil((interval - (now - lastSent)) / 1000);
      alert(`Please wait ${waitTime} seconds before resending OTP.`);
    }
  };


  const handleVerifyOTP = async (otp, userInfo) => {

    console.log('Verifying OTP:', otp, 'for user:', JSON.stringify(userInfo));
    if (!userInfo.phone.trim()) {
      setAlertMessage('⚠️ Please fill in all fields and upload a profile photo.');
      setShowAlert(true);
      return;
    }

    setIsLoad(true);

    // Simulate loading for testing

    try {
      const finalCountryCode = userInfo.countryCode || defaultCountryCode;
      const fullPhoneNumber = `${finalCountryCode}${userInfo.phone}`;
      const keyBundle = await createEncryptedKeyPair(userInfo.password);
      const privateKeyFingerprint = await hashPrivateKey(keyBundle.privateKey);
      const response = await signup({
        ...userInfo,
        phoneNumber: fullPhoneNumber,
        otpCode: otp,
        profilePhoto: userInfo.profileImage,
        publicKey: keyBundle.publicKey,
        privateKeyHash: keyBundle.privateKeyHash,
        privateKeyFingerprint,
        accepted_terms: !!userInfo.acceptedTerms,
        accepted_terms_at: new Date().toISOString(),
        accepted_terms_version: data.TermsVersion,
        accepted_terms_of_use: userInfo.acctepuse,
        accepted_terms_of_use_version: data.UseVersion
      });

      setIsLoad(false);
      console.log('Signup response:', response);

      if (response.success) {
        globalThis.storage.removeItem('otpRequestTime')
        globalThis.storage.setItem("privateKey", keyBundle.privateKey);
        await setTokens({ accessToken: response.data, refreshToken: response.refreshToken });
        const deviceId = (await getDeviceInfo()).deviceId;
        const wul = `wss://${data.SERVER_URL}?token=${encodeURIComponent(response.data)}&deviceId=${encodeURIComponent(deviceId)}&clientType=${getSocketClientType()}`;
        await connect(wul);
        await getuser();
        await sendPublicKeyToBackend(response.data, userInfo.password);
        history.push('/home');
      } else {
        const responseMessage = response?.message || response?.error?.message || "";
        switch (responseMessage) {
          case 'Invalid or expired OTP':
            setAlertMessage('❌ The OTP is incorrect or has expired. Please request a new one.');
            break;
          case 'User already exists':
            setAlertMessage('⚠️ A user with this email already exists.');
            break;
          default:
            setAlertMessage('❌ Signup failed. Please try again.2');
            break;
        }
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error in signup:', error);
      setAlertMessage('❌ An error occurred. Please try again.');
      setShowAlert(true);
      setIsLoad(false);
    }
    // Simulate a 2-second delay
  };

  if (isLoad) {
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
        <header className="login-topbar">
          <button type="button" className="login-brand-mark" onClick={() => history.push('/login')}>
            <img src="/echoid_v3.png" alt="" />
            <span>ECHOID </span>
          </button>

          <button type="button" className="login-signup-cta" onClick={() => history.push('/login')}>
            Log In
          </button>
        </header>

        <div className="login-screen-content">
          <section className="login-screen-brand-panel">
            <span className="login-brand-kicker">New Protocol Initialization</span>
            <h1>Create<br />Account</h1>
            <p>Join the EchoID ecosystem. Professional-grade security for digital architects. Experience the future of decentralized communication.</p>
          </section>

          <section className="login-screen-main-panel">
            <div className="login-card">
              <div className="login-card-corner" aria-hidden="true" />

              {currentStep === 1 ? (
                <UserInformationStep
                  onNext={handleNext}
                  host={host}
                  countryCode={defaultCountryCode}
                  setAlertMessage={setAlertMessage}
                  setShowAlert={setShowAlert}
                  initialInfo={userInfo}
                />
              ) : (
                <OTPVerificationStep
                  userInfo={userInfo}
                  onVerifyOTP={handleVerifyOTP}
                  handleback={handleback}
                  host={host}
                  setAlertMessage={setAlertMessage}
                  setShowAlert={setShowAlert}
                  countryCode={userInfo?.countryCode || defaultCountryCode}
                  otpRequestTime={otpRequestTime}
                  setOtpRequestTime={setOtpRequestTime}
                />
              )}
            </div>
          </section>
        </div>

        <footer className="login-footer">
          <div className="login-footer-inner">
            <strong>&copy; 2026 ECHOID.</strong>

            <div className={`login-status ${serverOnline ? "is-online" : "is-offline"}`}>
              <span aria-hidden="true" />
              <strong>{serverOnline ? "Nodes Online" : "Nodes Offline"}</strong>
            </div>
          </div>
        </footer>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Signup Process"
          message={alertMessage}
          buttons={['OK']}
        />
      </div>
    </div>
  );
};

export default SignupForm;
