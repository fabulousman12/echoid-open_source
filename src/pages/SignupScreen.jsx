import UserInformationStep from '../components/UserInformationStep';
import OTPVerificationStep from '../components/OTPVerificationStep';
import { useState, useContext, useEffect } from 'react';
import { useHistory } from 'react-router';
import { LoginContext } from '../Contexts/UserContext';
import { IonSpinner } from '@ionic/react';
import StarLoader from '../pages/StarLoader';
import data from '../data';
import { setTokens } from "../services/authTokens";
import { getDeviceInfo } from "../services/deviceInfo";
const SignupForm = ({sendPublicKeyToBackend,connect}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userInfo, setUserInfo] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoad, setIsLoad] = useState(false);
const [otp, setOtp] = useState('');
  const history = useHistory();
  const { signup,host,getuser } = useContext(LoginContext);
  const defaultCountryCode = '+91';
const [otpRequestTime, setOtpRequestTime] = useState(null);


  useEffect(() => {
    setTimeout(() => {
      setShowAlert(false);
    },5000)
  },[alertMessage,showAlert])
const handleNext = (info) => {
  setUserInfo(info);
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
      setAlertMessage('❌ Failed to send OTP due to low balance sorry (poor guy me). this is the otp' +json.otp);
handleVerifyOTP(json.otp, info)
      setShowAlert(true);
    
      return;
    }else if (!json.success) {
 setAlertMessage(json.message || '❌ Failed to send OTP. Please try again.');
      setShowAlert(true);
      return;
    }else{
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
    if (!userInfo.phone.trim() ) {
      setAlertMessage('⚠️ Please fill in all fields and upload a profile photo.');
      setShowAlert(true);
      return;
    }

    setIsLoad(true);

    // Simulate loading for testing
   
      try {
        const finalCountryCode = userInfo.countryCode || defaultCountryCode;
        const fullPhoneNumber = `${finalCountryCode}${userInfo.phone}`;
        const response = await signup({
          ...userInfo,
          phoneNumber: fullPhoneNumber,
          otpCode: otp,
          profilePhoto: userInfo.profileImage,
          accepted_terms: !!userInfo.acceptedTerms,
          accepted_terms_at: new Date().toISOString(),
          accepted_terms_version: data.TermsVersion,
        });

        setIsLoad(false);
        console.log('Signup response:', response);

    if (response.success) {
          globalThis.storage.removeItem('otpRequestTime')
          await setTokens({ accessToken: response.data, refreshToken: response.refreshToken });
const deviceId = (await getDeviceInfo()).deviceId;
const wul = `wss://${data.SERVER_URL}?token=${response.data}&deviceId=${encodeURIComponent(deviceId)}`;
                    await connect(wul);
                    await  getuser();
await sendPublicKeyToBackend(response.data);
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

  return (
    <div style={{ overflowY: 'auto', height: '100vh'}}>
      {isLoad && (
          <div style={{ textAlign: 'center',display: 'flex', justifyContent: 'center', alignItems: 'center',position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',background: 'linear-gradient(135deg, #141E30, #243B55)',height: '100vh',width:'100%',overflowY: 'auto',zIndex: '999999' }}>
          <StarLoader />
       
        </div>
      )}

{showAlert && (
  <div style={{
    backgroundColor: '#ffeded', // soft red background
    border: '1px solid #ff4d4d',
    color: '#b30000',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    width: '100%',
    zIndex: '9999999',
    position: 'fixed',
 
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(255, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
  }}>
    <span role="img" aria-label="warning" style={{ fontSize: '18px' }}>⚠️</span>
    {alertMessage + otp}
  </div>
)}




      {currentStep === 1 ? (
        <UserInformationStep onNext={handleNext} host={host} countryCode={defaultCountryCode}setAlertMessage={setAlertMessage} setShowAlert={setShowAlert} />
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
  );
};

export default SignupForm;
