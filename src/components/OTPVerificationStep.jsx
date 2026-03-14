import React, { useState, useEffect } from 'react';

const OTPVerificationStep = ({ userInfo, handleback, onVerifyOTP, setAlertMessage, setShowAlert, countryCode, host }) => {
  const [otp, setOtp] = useState('');
const [timeLeft, setTimeLeft] = useState(() => {
  const lastSent = parseInt(globalThis.storage.getItem('otpRequestTime') || '0');
  const now = Date.now();
  const secondsPassed = Math.floor((now - lastSent) / 1000);
  const remaining = 300 - secondsPassed;
  return remaining > 0 ? remaining : 0;
});

  useEffect(() => {
   //   const lastSent = parseInt(globalThis.storage.getItem('otpRequestTime') || '0');
    if (timeLeft === 0) return;

  

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length === 6) {
      onVerifyOTP(otp, userInfo);
    }else{
      setAlertMessage('Please enter a valid OTP.');
      setShowAlert(true);
    }
  };
    const handleResendOtp = async (number) => {
    const fullPhoneNumber = `${countryCode}${number}`;
    const response = await fetch(`${host}/user/sendotp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
    });
    const json = await response.json();
  
    setAlertMessage(`OTP sent to ${number}`);
    setShowAlert(true);
    
  };
const handleResend = () => {
  globalThis.storage.removeItem('otpRequestTime');
  const now = Date.now();
  globalThis.storage.setItem('otpRequestTime', now.toString());
  setTimeLeft(300);
  setOtp('');
  handleResendOtp(userInfo.phone); // Parent function to resend
};


  const formatTimeLeft = (seconds) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #141E30, #243B55)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif',
    },
    header: {
      width: '100%',
      maxWidth: 360,
      display: 'flex',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      gap: 12,
      zIndex: 200,
      marginBottom: 20,
      color: '#fff',
      padding: 16,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: '50%',
    },
    titleText: {
      fontSize: 15,
      fontWeight: 600,
    },
    form: {
      width: '90%',
      maxWidth: 360,
      marginTop: '30%',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      padding: 17,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      position: 'absolute',
      top: '30%',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    label: {
      fontSize: 14,
      fontWeight: 600,
      color: '#eee',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      fontSize: 13,
      borderRadius: 8,
      border: 'none',
      outline: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#fff',
    },
    button: {
      backgroundColor: '#4CAF50',
      color: '#fff',
      padding: '14px 20px',
      fontSize: 16,
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    backButton: {
      backgroundColor: '#f44336',
      color: '#fff',
      padding: '12px 20px',
      fontSize: 16,
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: 10,
    },
    mistakeText: {
      fontSize: 14,
      color: '#fff',
      textAlign: 'center',
      marginTop: 10,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <img src="/echoidv2.png" alt="Logo" style={styles.logo} />
        <span style={styles.titleText}>Verify OTP</span>
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Enter OTP sent to {countryCode} {userInfo?.phone}
        </label>
        <input
          type="text"
          maxLength="6"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          style={styles.input}
          required
        />

        <button type="submit" style={styles.button}>Verify OTP</button>

        <button type="button" onClick={handleback} style={styles.backButton}>
          Back
        </button>

        <div style={styles.mistakeText}>
          {timeLeft > 0 ? (
            `Resend OTP in ${formatTimeLeft(timeLeft)}`
          ) : (
            <span style={{ cursor: 'pointer', color: '#4CAF50' }} onClick={handleResend}>
              Resend OTP
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default OTPVerificationStep;
