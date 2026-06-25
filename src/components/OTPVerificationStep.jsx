import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

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
    } else {
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
    handleResendOtp(userInfo.phone);
  };

  const formatTimeLeft = (seconds) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="login-label">
        Enter 6-digit OTP sent to {countryCode} {userInfo?.phone}
      </label>
      <input
        type="text"
        maxLength="6"
        value={otp}
        className="login-input"
        placeholder="000000"
        onChange={(e) => setOtp(e.target.value)}
        required
      />

      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button type="submit" className="login-submit-btn">
          <span>Authorize Account</span>
          <ArrowRight size={17} strokeWidth={2} />
        </button>

        <button type="button" onClick={handleback} className="login-social-btn" style={{ width: '100%' }}>
          <span>Back to Credentials</span>
        </button>
      </div>

      <div className="login-mobile-signup" style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
        {timeLeft > 0 ? (
          <span>Resend OTP in {formatTimeLeft(timeLeft)}</span>
        ) : (
          <button type="button" className="login-signup-link" onClick={handleResend}>
            Resend OTP
          </button>
        )}
      </div>
    </form>
  );
};

export default OTPVerificationStep;
