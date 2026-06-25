import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { useHistory } from 'react-router';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import data from '../data';
import PrivacyPolicy from './PrivacyPolicy';
import TermsUse from './Terms_of_use';
// Reusing classes from LoginScreen.css
const styles = {
  cropperOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 9991,
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
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profilePreview: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #050505',
  },
  pickerPanel: {
    width: '92vw',
    maxWidth: 420,
    background: '#fff',
    color: '#050505',
    borderRadius: 0,
    padding: 24,
    border: '1px solid #050505',
  },
  pickerList: {
    maxHeight: '40vh',
    overflowY: 'auto',
    marginTop: 10,
    border: '1px solid #050505',
    borderRadius: 0,
  },
  pickerItem: {
    width: '100%',
    background: 'transparent',
    color: '#050505',
    border: 'none',
    borderBottom: '1px solid #eee',
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

const UserInformationStep = ({ onNext, setAlertMessage, setShowAlert, countryCode: defaultCountryCode = '+91', initialInfo }) => {
  const [name, setName] = useState(initialInfo?.name || '');
  const [email, setEmail] = useState(initialInfo?.email || '');
  const [countryCode, setCountryCode] = useState(initialInfo?.countryCode || defaultCountryCode);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState(initialInfo?.phone || '');
  const [password, setPassword] = useState(initialInfo?.password || '');
  const [profileImage, setProfileImage] = useState(initialInfo?.profileImage || null);
  const [acceptedTerms, setAcceptedTerms] = useState(initialInfo?.acceptedTerms || false);
  const [acctepuse, setAccepteduse] = useState(initialInfo?.acctepuse || false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showterm, setShowterm] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
const history = useHistory();
  const fileInputRef = useRef(null);
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
      console.warn("No native media selected, falling back to web picker");
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
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
       if (!acctepuse) {
      setShowAlert(true)
      return setAlertMessage('Please accept the Terms of use');
    }
          if (!name) {
      setShowAlert(true)
      return setAlertMessage('Please Enter a name');
    }
          if (!email) {
      setShowAlert(true)
      return setAlertMessage('Please enter a Email');
    }
          if (!password) {
      setShowAlert(true)
      return setAlertMessage('Please Enter a password');
    }

    const normalizedCountryCode = (countryCode || '').trim().replace(/\s+/g, '');
    const finalCountryCode = normalizedCountryCode.startsWith('+')
      ? normalizedCountryCode
      : `+${normalizedCountryCode}`;
    const userInfo = { name, email, countryCode: finalCountryCode, phone, password, profileImage, acceptedTerms,acctepuse };
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
      {profileImage && (
        <div style={styles.previewContainer}>
          <img src={profileImage} alt="Profile" style={styles.profilePreview} />
        </div>
      )}

      <div style={{ padding: '0 0 24px' }}>
        <span style={styles.titleText}>Sign up to EchoId</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        <label className="login-label">Name</label>
        <input 
          className="login-input" 
          type="text" 
          value={name} 
          placeholder="John Doe"
          onChange={(e) => setName(e.target.value)} 
          required 
        />

        <label className="login-label login-security-label">Email</label>
        <input 
          className="login-input" 
          type="email" 
          value={email} 
          placeholder="email@example.com"
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />

        <label className="login-label login-security-label">Phone</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            type="button" 
            className="login-input" 
            style={{ width: '100px', fontSize: '16px' }}
            onClick={() => setShowCountryPicker(true)}
          >
            {selectedCountry ? `${selectedCountry.dialCode}` : countryCode}
          </button>
          <input
            className="login-input"
            type="tel"
            value={phone}
            placeholder="0000000000"
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <label className="login-label login-security-label">Password</label>
        <div className="login-input-wrapper">
          <input 
            className="login-input" 
            type={showPassword ? "text" : "password"} 
            value={password} 
            placeholder="........"
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button
            type="button"
            className="login-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center' }}>
          <label className="login-label" style={{ marginBottom: 0, cursor: 'pointer' }} onClick={handlePickNative}>
            Profile Image
          </label>
          <FileOpenIcon style={{ marginLeft: '12px', cursor: 'pointer', color: '#050505' }} onClick={handlePickNative}/>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#050505', cursor: 'pointer' }}>
            <span
              onClick={() => setAcceptedTerms(!acceptedTerms)}
              style={{
                width: 18,
                height: 18,
                border: '1px solid #050505',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: acceptedTerms ? '#050505' : 'transparent',
                flex: '0 0 auto'
              }}
              aria-hidden="true"
            >
              {acceptedTerms && (
                <span style={{ width: 8, height: 8, background: '#fff' }} />
              )}
            </span>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPolicy(true); }}
                style={{ textDecoration: 'underline', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              >
                Privacy Policy
              </button>
            </span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#050505', cursor: 'pointer' }}>
            <span
              onClick={() => setAccepteduse(!acctepuse)}
              style={{
                width: 18,
                height: 18,
                border: '1px solid #050505',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: acctepuse ? '#050505' : 'transparent',
                flex: '0 0 auto'
              }}
              aria-hidden="true"
            >
              {acctepuse && (
                <span style={{ width: 8, height: 8, background: '#fff' }} />
              )}
            </span>
            <input
              type="checkbox"
              checked={acctepuse}
              onChange={(e) => setAccepteduse(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowterm(true); }}
                style={{ textDecoration: 'underline', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              >
                Terms of Use
              </button>
            </span>
          </label>
        </div>

        <button type="submit" className="login-submit-btn">
          <span>Initialize Verification</span>
          <ArrowRight size={17} strokeWidth={2} />
        </button>

        <div className="login-mobile-signup" style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <span>Already registered?</span>
          <button type="button" className="login-signup-link" onClick={() => history.push('/login')}>
            Log in
          </button>
        </div>
      </form>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

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
            <div style={{ fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Select Country Code</div>
            <input
              className="login-input"
              style={{ height: '44px', fontSize: '16px' }}
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search country..."
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
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setShowCountryPicker(false)} className="login-signup-cta" style={{ minWidth: '80px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPolicy && (
        <div style={styles.cropperOverlay}>
          <div style={{ width: '90vw', maxWidth: 520, background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16 }}>
            <PrivacyPolicy
              variant="dark"
              showVersionHeader
              onClose={() => setShowPolicy(false)}
              onAccept={() => {
                setAcceptedTerms(true);
                setShowPolicy(false);
              }}
              cancelButtonStyle={styles.cancelButton}
              acceptButtonStyle={styles.cropButton}
            />
          </div>
        </div>
      )}
       {showterm && (
        <div style={styles.cropperOverlay}>
          <div style={{ width: '90vw', maxWidth: 520, background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16 }}>
            <TermsUse
              variant="dark"
              showVersionHeader
              onClose={() => setShowterm(false)}
              onAccept={() => {
                setAccepteduse(true);
                setShowterm(false);
              }}
              cancelButtonStyle={styles.cancelButton}
              acceptButtonStyle={styles.cropButton}
            />
          </div>
        </div>
      )}
      </div>
    );
};

export default UserInformationStep;
