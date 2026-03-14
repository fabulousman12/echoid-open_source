import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useHistory } from 'react-router';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { IonButton } from '@ionic/react';

import google from '../pages/google.png';
import data from '../data';
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
    zIndex:200,
    marginBottom: 20,
    color: '#fff',
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
    marginTop: 100,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 17,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
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
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profilePreview: {
    width: 150,
    height: 150,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #fff',
  },
  cropperOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropperWrapper: {
    width: '90vw',
    height: '70vh',
  },
  cropperControls: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
  },
  cropButton: {
    backgroundColor: '#2196F3',
    color: '#fff',
    padding: '12px 20px',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    zIndex: 999,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    color: '#fff',
    padding: '12px 20px',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    zIndex: 999,
    cursor: 'pointer',
  },
  socialRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 15px',
    fontWeight: 600,
    fontSize: 15,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  googleButton: {
    backgroundColor: '#fff',
    color: '#444',
    border: '1px solid #ddd',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    color: '#fff',
    border: 'none',
  },
  socialIcon: {
    marginRight: 10,
    height: 20,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '10px 0',
    color: '#ccc',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
    opacity: 0.3,
  },
  dividerText: {
    padding: '0 10px',
    fontSize: 14,
  },
  loginText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    color: '#ccc',
  },
  loginLink: {
    color: '#4CAF50',
    marginLeft: 5,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  countryPickerButton: {
    width: 130,
    padding: '12px 10px',
    fontSize: 13,
    borderRadius: 8,
    border: 'none',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    textAlign: 'left',
    cursor: 'pointer',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  pickerPanel: {
    width: '92vw',
    maxWidth: 420,
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    border: '1px solid rgba(148,163,184,0.35)',
  },
  pickerList: {
    maxHeight: '55vh',
    overflowY: 'auto',
    marginTop: 10,
    border: '1px solid rgba(148,163,184,0.25)',
    borderRadius: 8,
  },
  pickerItem: {
    width: '100%',
    background: 'transparent',
    color: '#e2e8f0',
    border: 'none',
    borderBottom: '1px solid rgba(148,163,184,0.2)',
    textAlign: 'left',
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },
};

const COUNTRY_DIAL_CODES = [
  { name: 'India', dialCode: '+91' },
  { name: 'United States', dialCode: '+1' },
  { name: 'United Kingdom', dialCode: '+44' },
  { name: 'Canada', dialCode: '+1' },
  { name: 'Australia', dialCode: '+61' },
  { name: 'Germany', dialCode: '+49' },
  { name: 'France', dialCode: '+33' },
  { name: 'Italy', dialCode: '+39' },
  { name: 'Spain', dialCode: '+34' },
  { name: 'Netherlands', dialCode: '+31' },
  { name: 'Sweden', dialCode: '+46' },
  { name: 'Norway', dialCode: '+47' },
  { name: 'Denmark', dialCode: '+45' },
  { name: 'Switzerland', dialCode: '+41' },
  { name: 'Austria', dialCode: '+43' },
  { name: 'Belgium', dialCode: '+32' },
  { name: 'Portugal', dialCode: '+351' },
  { name: 'Ireland', dialCode: '+353' },
  { name: 'Poland', dialCode: '+48' },
  { name: 'Czech Republic', dialCode: '+420' },
  { name: 'United Arab Emirates', dialCode: '+971' },
  { name: 'Saudi Arabia', dialCode: '+966' },
  { name: 'Qatar', dialCode: '+974' },
  { name: 'Kuwait', dialCode: '+965' },
  { name: 'Bahrain', dialCode: '+973' },
  { name: 'Oman', dialCode: '+968' },
  { name: 'Pakistan', dialCode: '+92' },
  { name: 'Bangladesh', dialCode: '+880' },
  { name: 'Nepal', dialCode: '+977' },
  { name: 'Sri Lanka', dialCode: '+94' },
  { name: 'Singapore', dialCode: '+65' },
  { name: 'Malaysia', dialCode: '+60' },
  { name: 'Thailand', dialCode: '+66' },
  { name: 'Indonesia', dialCode: '+62' },
  { name: 'Philippines', dialCode: '+63' },
  { name: 'Vietnam', dialCode: '+84' },
  { name: 'Japan', dialCode: '+81' },
  { name: 'South Korea', dialCode: '+82' },
  { name: 'China', dialCode: '+86' },
  { name: 'Hong Kong', dialCode: '+852' },
  { name: 'Taiwan', dialCode: '+886' },
  { name: 'New Zealand', dialCode: '+64' },
  { name: 'South Africa', dialCode: '+27' },
  { name: 'Nigeria', dialCode: '+234' },
  { name: 'Kenya', dialCode: '+254' },
  { name: 'Egypt', dialCode: '+20' },
  { name: 'Turkey', dialCode: '+90' },
  { name: 'Israel', dialCode: '+972' },
  { name: 'Brazil', dialCode: '+55' },
  { name: 'Mexico', dialCode: '+52' },
  { name: 'Argentina', dialCode: '+54' },
  { name: 'Chile', dialCode: '+56' },
  { name: 'Colombia', dialCode: '+57' },
  { name: 'Peru', dialCode: '+51' },
];

const UserInformationStep = ({ onNext, setAlertMessage, setShowAlert, countryCode: defaultCountryCode = '+91' }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
const history = useHistory();
  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

const IMAGE_EXT_WHITELIST = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

const isImageFile = (file) => {
  if (!file) return false;

  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return true;
  }

  if (file.name) {
    const name = file.name.toLowerCase();
    return IMAGE_EXT_WHITELIST.some(ext => name.endsWith(ext));
  }

  return false;
};
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };
  async function pickMediaAndSaveToShared() {
    console.log("hey")
  return new Promise((resolve) => {
    const handler = (event) => {
      window.removeEventListener('MediaSelected', handler);

      const detail = event.detail || {};
      const names = detail.names || [];
      const types = detail.types || [];
      const previews = detail.previews || [];

      const files = names.map((name, i) => ({
        name,
        type: types[i],
        preview: previews[i],
      }));

      resolve(files);
    };

    window.addEventListener('MediaSelected', handler);

    if (window.NativeAds?.pickMediaNative) {
      window.NativeAds.pickMediaNative(0); // 0 = multiple
    } else {
      console.warn('❌ Native picker not available.');
      resolve([]);
    }
  });
}

const handlePickNative = async () => {
  try {
    const files = await pickMediaAndSaveToShared();

    if (!files || !files.length) {
      console.warn("No media selected");
      return;
    }

    const file = files[0];

    console.log("file getter", JSON.stringify(files))
    if (!isImageFile(file)) {
      alert("Only image files are allowed");
      return;
    }


    // IMPORTANT: your native returns base64 or blob-url in `preview`
    if (!file.preview) {
      console.warn("preview missing on native file");
      return;
    }

    // feed directly into cropper pipeline
    setImageSrc(file.preview);
    setShowCropper(true);

  } catch (err) {
    console.error("Native picker error:", err);
  }
};

  const handleCropDone = async () => {
    const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
    setProfileImage(croppedImg);
    setShowCropper(false);
  };

  const getCroppedImg = async (imageSrc, croppedAreaPixels) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );
return new Promise((resolve) => {
  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // ❌ base64
    reader.readAsDataURL(blob);                      // ❌ converts to base64
  }, 'image/jpeg');
});


  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const handleSubmit = (e) => {
    e.preventDefault();
   
    if (!acceptedTerms) {
      setShowAlert(true)
      return setAlertMessage('Please accept the Privacy Policy to continue.');
    }
    const normalizedCountryCode = (countryCode || '').trim().replace(/\s+/g, '');
    const finalCountryCode = normalizedCountryCode.startsWith('+')
      ? normalizedCountryCode
      : `+${normalizedCountryCode}`;
    const userInfo = { name, email, countryCode: finalCountryCode, phone, password, profileImage, acceptedTerms };
    onNext(userInfo);
  };
  const selectedCountry = COUNTRY_DIAL_CODES.find((c) => c.dialCode === countryCode);
  const filteredCountries = COUNTRY_DIAL_CODES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.includes(countrySearch.trim())
  );
  const handleSelectCountry = (code) => {
    setCountryCode(code);
    setShowCountryPicker(false);
    setCountrySearch('');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img
          src="/echoidv2.png"
          alt="App Logo"
          style={styles.logo}
        />
        <span style={styles.titleText}>Sign up to EchoId</span>
      </div>

    

      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        {/* Social Logins */}  {profileImage && (
        <div style={styles.previewContainer}>
        <img src={profileImage} alt="Profile" style={styles.profilePreview} />
      </div>
    )}
        <div style={styles.socialRow}>
          <button type="button" style={{ ...styles.socialButton, ...styles.googleButton }}>
          <img
  src={google}
  alt="Google"
  style={styles.socialIcon}
/>

            Google
          </button>
          <button type="button" style={{ ...styles.socialButton, ...styles.facebookButton }}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png"
              alt="Facebook"
              style={styles.socialIcon}
            />
            Facebook
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Inputs */}
        <div>
          <label style={styles.label}>Name</label>
          <input style={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label style={styles.label}>Phone</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={styles.countryPickerButton} onClick={() => setShowCountryPicker(true)}>
              {selectedCountry ? `${selectedCountry.dialCode}` : countryCode}
            </button>
            <input
              style={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className='mx-1'>
          <label style={styles.label} onClick={handlePickNative}>Profile Image</label>
        <FileOpenIcon className='mx-2' onClick={handlePickNative}/>

        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px' }}>
          <span
            onClick={() => setAcceptedTerms(!acceptedTerms)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: '2px solid rgba(255,255,255,0.6)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: acceptedTerms ? '#22c55e' : 'transparent',
              cursor: 'pointer',
              flex: '0 0 auto'
            }}
            aria-hidden="true"
          >
            {acceptedTerms && (
              <span style={{ width: 8, height: 8, background: '#0f172a', borderRadius: 2 }} />
            )}
          </span>
          <input
            type="checkbox"
            name="acceptedTerms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 1,
              height: 1,
              margin: 0,
              padding: 0,
              border: 0,
            }}
          />
          <span style={{ lineHeight: 1.4 }}>
            I agree to the{" "}
            <button
              type="button"
              onClick={() => setShowPolicy(true)}
              style={{ color: '#8bd3ff', textDecoration: 'underline', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Privacy Policy
            </button>{" "}
            (version {data.TermsVersion}).
          </span>
        </label>
   

        <button type="submit" style={styles.button}>Next</button>

        <div style={styles.loginText}>
          Already have an account?
          <span style={styles.loginLink} onClick={() => history.push('/login')}>Log in</span>
        </div>
      </form>

      {showCropper && (
        <div style={styles.cropperOverlay}>
          <div style={styles.cropperWrapper}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={styles.cropperControls}>
            <button onClick={handleCropDone} style={styles.cropButton}>Crop</button>
            <button onClick={() => setShowCropper(false)} style={styles.cancelButton}>Cancel</button>
          </div>
        </div>
      )}

      {showCountryPicker && (
        <div style={styles.cropperOverlay}>
          <div style={styles.pickerPanel}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Select Country Code</div>
            <input
              style={styles.input}
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search country or code"
            />
            <div style={styles.pickerList}>
              {filteredCountries.map((country) => (
                <button
                  key={`${country.name}-${country.dialCode}`}
                  type="button"
                  style={styles.pickerItem}
                  onClick={() => handleSelectCountry(country.dialCode)}
                >
                  {country.name} ({country.dialCode})
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>No countries found.</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" onClick={() => setShowCountryPicker(false)} style={styles.cancelButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPolicy && (
        <div style={styles.cropperOverlay}>
          <div style={{ width: '90vw', maxWidth: 520, background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Privacy Policy</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
              Version {data.TermsVersion}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#e2e8f0', maxHeight: '55vh', overflowY: 'auto' }}>
              <p>
                By using this app, you agree to this Privacy Policy. We respect your privacy and are
                committed to protecting your information.
              </p>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 6 }}>
                Privacy Policy version: {data.TermsVersion}
              </p>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Information we store</div>
                <div>
                  We store basic account details you provide such as name, email, phone number, and
                  profile image at account creation.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Messages and delivery</div>
                <div>
                  Messages are stored on our servers only while undelivered. After delivery, they are
                  removed from the database.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Local device storage</div>
                <div>
                  Chat history, call history, app preferences (mute, notification sounds), and
                  downloaded files are stored locally on your device for performance and offline access.
                  You can delete local data from within the app.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Security and sessions</div>
                <div>
                  Device details like model and OS are used to manage login sessions and keep your
                  account secure.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Session metadata</div>
                <div>
                  For security, we store session metadata such as device name, OS, app version,
                  IP address, last active time, and user agent.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Encryption</div>
                <div>
                  Messages are encrypted using asymmetric RSA 2048-bit cryptography. Your private key
                  stays only on your device. A one-way hash + salt is stored in the database for
                  matching purposes. Passwords are also stored as one-way hash + salt.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Media and permissions</div>
                <div>
                  Camera and microphone access are used for calls and voice messages. Photo and media
                  access are used for profile images and attachments. Contacts access is optional and
                  only used to show your device contacts when you create a new chat.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Files and attachments</div>
                <div>
                  Files you send are uploaded to our servers for delivery and may be retained as needed
                  for recipients to download. Downloaded files are saved on your device.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Location</div>
                <div>
                  If you choose to set a location, we use a location search service to help you pick
                  it. Providing location is optional.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Notifications</div>
                <div>
                  Dead app delivery is handled by third-party services such as FCM and Pushy. We do
                  not use extra data without your prior permission. We store a device token to send
                  notifications.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Calls</div>
                <div>
                  Calls are designed to be peer-to-peer to bypass servers when possible. A TURN server
                  is used as a fallback. Call history is saved locally on your device.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Your choices</div>
                <div>
                  You can edit your profile, manage sessions, and request account deletion.
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Contact</div>
                <div>If you have questions about privacy, contact support.</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowPolicy(false)} style={styles.cancelButton}>Close</button>
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowPolicy(false);
                }}
                style={styles.cropButton}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInformationStep;
