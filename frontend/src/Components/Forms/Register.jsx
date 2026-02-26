"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Countries list: USA and Canada removed per requirement
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
  "Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe"
];

// Country name -> dial code (for phone prefix). Fills when user selects country.
const COUNTRY_DIAL_CODES = {
  "Afghanistan": "+93","Albania": "+355","Algeria": "+213","Andorra": "+376","Angola": "+244","Antigua and Barbuda": "+1268","Argentina": "+54","Armenia": "+374","Australia": "+61","Austria": "+43","Azerbaijan": "+994",
  "Bahamas": "+1242","Bahrain": "+973","Bangladesh": "+880","Barbados": "+1246","Belarus": "+375","Belgium": "+32","Belize": "+501","Benin": "+229","Bhutan": "+975","Bolivia": "+591","Bosnia and Herzegovina": "+387","Botswana": "+267","Brazil": "+55","Brunei": "+673","Bulgaria": "+359","Burkina Faso": "+226","Burundi": "+257",
  "Cabo Verde": "+238","Cambodia": "+855","Cameroon": "+237","Central African Republic": "+236","Chad": "+235","Chile": "+56","China": "+86","Colombia": "+57","Comoros": "+269","Congo, Democratic Republic of the": "+243","Congo, Republic of the": "+242","Costa Rica": "+506","Cote d'Ivoire": "+225","Croatia": "+385","Cuba": "+53","Cyprus": "+357","Czechia": "+420",
  "Denmark": "+45","Djibouti": "+253","Dominica": "+1767","Dominican Republic": "+1809",
  "Ecuador": "+593","Egypt": "+20","El Salvador": "+503","Equatorial Guinea": "+240","Eritrea": "+291","Estonia": "+372","Eswatini": "+268","Ethiopia": "+251",
  "Fiji": "+679","Finland": "+358","France": "+33",
  "Gabon": "+241","Gambia": "+220","Georgia": "+995","Germany": "+49","Ghana": "+233","Greece": "+30","Grenada": "+1473","Guatemala": "+502","Guinea": "+224","Guinea-Bissau": "+245","Guyana": "+592",
  "Haiti": "+509","Honduras": "+504","Hungary": "+36",
  "Iceland": "+354","India": "+91","Indonesia": "+62","Iran": "+98","Iraq": "+964","Ireland": "+353","Israel": "+972","Italy": "+39",
  "Jamaica": "+1876","Japan": "+81","Jordan": "+962",
  "Kazakhstan": "+7","Kenya": "+254","Kiribati": "+686","Kuwait": "+965","Kyrgyzstan": "+996",
  "Laos": "+856","Latvia": "+371","Lebanon": "+961","Lesotho": "+266","Liberia": "+231","Libya": "+218","Liechtenstein": "+423","Lithuania": "+370","Luxembourg": "+352",
  "Madagascar": "+261","Malawi": "+265","Malaysia": "+60","Maldives": "+960","Mali": "+223","Malta": "+356","Marshall Islands": "+692","Mauritania": "+222","Mauritius": "+230","Mexico": "+52","Micronesia": "+691","Moldova": "+373","Monaco": "+377","Mongolia": "+976","Montenegro": "+382","Morocco": "+212","Mozambique": "+258","Myanmar": "+95",
  "Namibia": "+264","Nauru": "+674","Nepal": "+977","Netherlands": "+31","New Zealand": "+64","Nicaragua": "+505","Niger": "+227","Nigeria": "+234","North Macedonia": "+389","Norway": "+47",
  "Oman": "+968",
  "Pakistan": "+92","Palau": "+680","Panama": "+507","Papua New Guinea": "+675","Paraguay": "+595","Peru": "+51","Philippines": "+63","Poland": "+48","Portugal": "+351",
  "Qatar": "+974",
  "Romania": "+40","Russia": "+7","Rwanda": "+250",
  "Saint Kitts and Nevis": "+1869","Saint Lucia": "+1758","Saint Vincent and the Grenadines": "+1784","Samoa": "+685","San Marino": "+378","Sao Tome and Principe": "+239","Saudi Arabia": "+966","Senegal": "+221","Serbia": "+381","Seychelles": "+248","Sierra Leone": "+232","Singapore": "+65","Slovakia": "+421","Slovenia": "+386","Solomon Islands": "+677","Somalia": "+252","South Africa": "+27","South Sudan": "+211","Spain": "+34","Sri Lanka": "+94","Sudan": "+249","Suriname": "+597","Sweden": "+46","Switzerland": "+41","Syria": "+963",
  "Taiwan": "+886","Tajikistan": "+992","Tanzania": "+255","Thailand": "+66","Timor-Leste": "+670","Togo": "+228","Tonga": "+676","Trinidad and Tobago": "+1868","Tunisia": "+216","Turkey": "+90","Turkmenistan": "+993","Tuvalu": "+688",
  "Uganda": "+256","Ukraine": "+380","United Arab Emirates": "+971","United Kingdom": "+44","Uruguay": "+598","Uzbekistan": "+998",
  "Vanuatu": "+678","Vatican City": "+379","Venezuela": "+58","Vietnam": "+84",
  "Yemen": "+967",
  "Zambia": "+260","Zimbabwe": "+263"
};

// Example remaining part of phone number (with spaces) per country - reflects typical local format
const COUNTRY_PHONE_PLACEHOLDERS = {
  "Rwanda": "782 123 456",
  "Uganda": "712 345 678",
  "Kenya": "712 345 678",
  "Tanzania": "712 345 678",
  "United Kingdom": "7911 123 456",
  "Nigeria": "801 234 5678",
  "South Africa": "82 123 4567",
  "India": "98765 43210",
  "Germany": "171 123 4567",
  "France": "6 12 34 56 78",
  "Australia": "412 345 678",
  "Brazil": "11 91234 5678",
  "Mexico": "55 1234 5678",
  "Philippines": "912 345 6789",
  "Egypt": "100 123 4567",
  "Pakistan": "300 123 4567",
  "Bangladesh": "1812 345 678",
  "Vietnam": "91 234 56 78",
  "Turkey": "532 123 4567",
  "Indonesia": "812 3456 7890",
  "Netherlands": "6 12345678",
  "Saudi Arabia": "50 123 4567",
  "United Arab Emirates": "50 123 4567",
  "Israel": "50 123 4567",
  "Poland": "512 345 678",
  "Spain": "612 34 56 78",
  "Italy": "312 345 6789",
  "Thailand": "81 234 5678",
  "Ethiopia": "91 123 4567",
  "Ghana": "23 123 4567",
  "Morocco": "612 345 678",
  "Zimbabwe": "71 123 4567",
  "Zambia": "97 123 4567",
  "Malawi": "99 123 4567",
  "Senegal": "70 123 45 67",
  "Cameroon": "6 12 34 56 78",
  "Cote d'Ivoire": "07 12 34 56 78",
  "Tunisia": "20 123 456",
  "Libya": "91 234 5678",
  "Sudan": "91 123 4567",
  "Iraq": "791 234 5678",
  "Iran": "912 345 6789",
  "Afghanistan": "70 123 4567",
  "Bangladesh": "1812 345 678",
  "Sri Lanka": "77 123 4567",
  "Nepal": "984 123 4567",
  "Myanmar": "9 123 456 789",
  "Cambodia": "12 234 567",
  "Laos": "20 23 123 456",
  "Singapore": "9123 4567",
  "Malaysia": "12 345 6789",
  "New Zealand": "21 123 4567",
  "Argentina": "11 1234 5678",
  "Colombia": "300 123 4567",
  "Chile": "9 1234 5678",
  "Peru": "987 654 321",
  "Ecuador": "99 123 4567",
  "Romania": "712 345 678",
  "Ukraine": "67 123 4567",
  "Kazakhstan": "7 701 123 4567",
  "Greece": "691 123 4567",
  "Portugal": "91 123 4567",
  "Czechia": "601 123 456",
  "Hungary": "20 123 4567",
  "Sweden": "70 123 45 67",
  "Norway": "406 12 345",
  "Denmark": "20 12 34 56",
  "Finland": "40 123 4567",
  "Ireland": "85 123 4567",
  "Belgium": "470 12 34 56",
  "Austria": "660 123 456",
  "Switzerland": "78 123 45 67",
  "Japan": "90 1234 5678",
  "China": "138 1234 5678",
  "South Korea": "10 1234 5678",
  "Hong Kong": "5123 4567",
  "Taiwan": "912 345 678",
  "Lebanon": "71 123 456",
  "Jordan": "7 1234 5678",
  "Kuwait": "5000 1234",
  "Qatar": "3312 3456",
  "Bahrain": "3600 1234",
  "Oman": "9123 4567",
  "Yemen": "712 345 678",
  "Syria": "944 123 456",
  "Algeria": "55 12 34 56 78",
  "Botswana": "71 123 456",
  "Namibia": "81 123 4567",
  "Mozambique": "84 123 4567",
  "Angola": "923 123 456",
  "Congo, Democratic Republic of the": "81 234 5678",
  "Congo, Republic of the": "06 123 45 67",
  "Ethiopia": "91 123 4567",
  "Somalia": "61 234 567",
  "Liberia": "77 123 4567",
  "Sierra Leone": "76 123 456",
  "Guinea": "601 12 34 56",
  "Burkina Faso": "70 12 34 56",
  "Mali": "65 12 34 56",
  "Niger": "93 12 34 56",
  "Chad": "66 12 34 56",
  "Central African Republic": "72 12 34 56",
  "Gabon": "6 01 23 45 67",
  "Benin": "90 12 34 56",
  "Togo": "90 12 34 56",
  "Gambia": "30 12 34 56",
  "Mauritania": "22 12 34 56",
  "Mauritius": "5 123 4567",
  "Madagascar": "32 12 345 67",
  "Malawi": "99 123 4567",
  "Zambia": "97 123 4567",
  "Zimbabwe": "71 123 4567",
  "Lesotho": "5 123 4567",
  "Eswatini": "76 123 4567",
  "South Sudan": "91 123 4567",
  "Burundi": "79 12 34 56",
  "Djibouti": "77 12 34 56",
  "Eritrea": "7 123 456",
  "Cuba": "5 123 4567",
  "Haiti": "34 12 3456",
  "Dominican Republic": "809 123 4567",
  "Jamaica": "876 123 4567",
  "Trinidad and Tobago": "868 123 4567",
  "Barbados": "246 123 4567",
  "Bahamas": "242 123 4567",
  "Belize": "622 1234",
  "Costa Rica": "8312 3456",
  "Panama": "6123 4567",
  "Guatemala": "5123 4567",
  "Honduras": "9123 4567",
  "El Salvador": "7012 3456",
  "Nicaragua": "8123 4567",
  "Bolivia": "7123 4567",
  "Paraguay": "961 123 456",
  "Uruguay": "99 123 456",
  "Venezuela": "412 123 4567",
  "Ecuador": "99 123 4567",
  "Guyana": "609 1234",
  "Suriname": "712 3456",
  "Fiji": "701 2345",
  "Papua New Guinea": "7012 3456",
  "Solomon Islands": "74 12345",
  "Vanuatu": "77 12345",
  "Samoa": "72 12345",
  "Tonga": "77 12345",
  "Kiribati": "7200 1234",
  "Maldives": "798 1234",
  "Sri Lanka": "77 123 4567",
  "Nepal": "984 123 4567",
  "Bhutan": "17 12 34 56",
  "Mongolia": "99 12 34 56",
  "Georgia": "555 12 34 56",
  "Armenia": "77 123 456",
  "Azerbaijan": "50 123 45 67",
  "Belarus": "29 123 45 67",
  "Moldova": "62 123 456",
  "Albania": "67 123 4567",
  "North Macedonia": "72 123 456",
  "Bosnia and Herzegovina": "61 123 456",
  "Serbia": "62 123 4567",
  "Croatia": "92 123 4567",
  "Slovenia": "31 234 567",
  "Slovakia": "912 123 456",
  "Bulgaria": "87 123 4567",
  "Lithuania": "612 34567",
  "Latvia": "21 234 567",
  "Estonia": "5123 4567",
  "Cyprus": "96 123 456",
  "Malta": "7912 3456",
  "Luxembourg": "628 123 456",
  "Monaco": "6 12 34 56 78",
  "San Marino": "66 66 12 12",
  "Vatican City": "06 698 12345",
  "Andorra": "312 345",
  "Liechtenstein": "79 123 45 67",
  "Iceland": "611 1234",
  "Russia": "912 345 6789",
  "Uzbekistan": "91 123 45 67",
  "Kazakhstan": "7 701 123 4567",
  "Tajikistan": "91 123 4567",
  "Kyrgyzstan": "700 123 456",
  "Turkmenistan": "61 123 456",
};

function getPhonePlaceholder(country) {
  if (!country) return 'Select country first';
  return COUNTRY_PHONE_PLACEHOLDERS[country] || '123 456 7890';
}

function formatPhoneWithSpaces(digitsOnly) {
  const d = (digitsOnly || '').replace(/\D/g, '');
  if (!d) return '';
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    country: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    is18Plus: false,
    acceptedTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralInfo, setReferralInfo] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const errorRef = useRef(null)

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode) {
        setFormData(prev => ({ ...prev, referralCode: refCode }));
        fetchReferralInfo(refCode);
      }
    }
  }, []);

  const fetchReferralInfo = async (referralCode) => {
    try {
      const response = await fetch(`${apiUrl}/auth/referrer-info?code=${referralCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReferralInfo(data.data || data);
      }
    } catch (err) {
      console.error('Error fetching referral info:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '')
      setFormData({ ...formData, [name]: digitsOnly })
      return
    }
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName?.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!formData.username?.trim()) {
      setError('Please enter a username.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (!formData.email?.trim() && !formData.phoneNumber?.trim()) {
      setError('Please provide either email or phone number.')
      return
    }
    if (!formData.is18Plus) {
      setError('You must confirm you are 18 or older to register.')
      return
    }
    if (!formData.acceptedTerms) {
      setError('You must agree to the Terms & Conditions and Privacy Policy.')
      return
    }

    setLoading(true)

    try {
      const nameParts = formData.fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      let username = formData.username
      if (!username && formData.email) {
        username = formData.email.split('@')[0]
      }
      if (!username) {
        username = formData.fullName.replace(/\s+/g, '').toLowerCase()
      }

      const requestBody = {
        password: formData.password,
        username,
        firstName,
        lastName,
        is18Plus: true,
        acceptedTerms: true,
        acceptedPrivacy: true,
      }
      if (formData.email) requestBody.email = formData.email
      if (formData.phoneNumber) {
        const dialCode = formData.country ? (COUNTRY_DIAL_CODES[formData.country] || '') : ''
        requestBody.phone = dialCode
          ? dialCode + formData.phoneNumber.replace(/\D/g, '')
          : formData.phoneNumber.replace(/\D/g, '')
      }
      if (formData.referralCode) requestBody.referredBy = formData.referralCode

      console.log('Sending registration request to:', `${apiUrl}/auth/register`)
      console.log('Request body:', requestBody)

      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)

      let responseBody = {}
      try {
        responseBody = await response.json()
      } catch {
        responseBody = { message: 'Invalid response from server.' }
      }
      console.log('Response data:', responseBody)

      if (!response.ok) {
        const msg = Array.isArray(responseBody.message)
          ? responseBody.message.join(', ')
          : (responseBody.message || 'Registration failed. Please try again.')
        setError(msg)
        return
      }

      const payload = responseBody?.data ?? responseBody

      if (!payload?.token || !payload?.user) {
        throw new Error('Invalid response from server')
      }

      localStorage.setItem('token', payload.token)
      localStorage.setItem('user', JSON.stringify(payload.user))

      if (formData.referralCode) {
        alert(`🎉 Registration successful! You were referred by ${referralInfo?.username || 'a friend'}.`);
      }

      const role = (payload.user.role || 'USER').toUpperCase()
      // After registration, go directly to spin/game
      const nextRoute = role === 'ADMIN' || role === 'SUPER_ADMIN'
        ? '/admin/dashboard'
        : '/dashboard/spin'

      router.replace(nextRoute)
    } catch (err) {
      console.error('Registration error details:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-left"></div>

      <div className="register-right">
        <div className="register-form-wrapper">
          {/* Go to Landing Page Button */}
          <div className="back-to-landing">
            <button 
              type="button" 
              onClick={() => router.push('/')}
              className="landing-button"
            >
              ← Go to Landing Page
            </button>
          </div>
          
          <h1 className="register-title">Create an Account</h1>
          
          {formData.referralCode && (
            <div className="auth-message auth-message--info referral-notice">
              <div className="referral-badge">
                🎁 Referral Signup
              </div>
              {referralInfo ? (
                <p className="referral-text">
                  You were invited by <strong>{referralInfo.username}</strong>
                  {referralInfo.firstName && ` (${referralInfo.firstName})`}
                </p>
              ) : (
                <p className="referral-text">
                  You're signing up with a referral link
                </p>
              )}
            </div>
          )}
          
          <p className="register-subtitle">
            Are you ready to join us? Let's create Account
          </p>

          {error && (
            <div ref={errorRef} id="register-error" className="auth-message auth-message--error" role="alert">
              {error}
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <label>Full name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              required
              disabled={loading}
            />

            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              required
              disabled={loading}
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@gmail.com"
              disabled={loading}
            />

            {/* Country first so phone prefix can use it */}
            <label>Country (Optional)</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="country-select"
              disabled={loading}
            >
              <option value="">Select country (optional)</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              Country sets the phone code below
            </small>

            <label>Phone Number (optional)</label>
            <div className="phone-input-group">
              <span className="phone-prefix">
                {formData.country && COUNTRY_DIAL_CODES[formData.country]
                  ? COUNTRY_DIAL_CODES[formData.country]
                  : '—'}
              </span>
              <input
                type="tel"
                name="phoneNumber"
                className="phone-number-input"
                value={formatPhoneWithSpaces(formData.phoneNumber)}
                onChange={handleChange}
                placeholder={getPhonePlaceholder(formData.country)}
                disabled={loading}
              />
            </div>

            <label>Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                required
                minLength="6"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label>Confirm password</label>
            <div className="password-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="********"
                required
                minLength="6"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label className="register-checkbox">
              <input
                type="checkbox"
                name="is18Plus"
                checked={formData.is18Plus}
                onChange={handleChange}
                disabled={loading}
              />
              <span>I confirm I am 18 or older</span>
            </label>

            <label className="register-checkbox">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleChange}
                disabled={loading}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Terms &amp; Conditions</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
              </span>
            </label>
            <p className="register-checkboxes-hint">Both boxes must be checked to continue.</p>

            {formData.referralCode && (
              <input
                type="hidden"
                name="referralCode"
                value={formData.referralCode}
              />
            )}

            <button
              type="submit"
              className="register-btn"
              disabled={loading || !formData.is18Plus || !formData.acceptedTerms}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="register-divider">
            <span>OR</span>
          </div>

          <button 
            type="button"
            className="google-btn"
            onClick={() => {
              const googleAuthUrl = formData.referralCode 
                ? `${apiUrl}/auth/google?ref=${formData.referralCode}`
                : `${apiUrl}/auth/google`;
              
              const width = 500;
              const height = 600;
              const left = (window.screen.width - width) / 2;
              const top = (window.screen.height - height) / 2;
              
              const popup = window.open(
                googleAuthUrl,
                'Google OAuth',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
              );
              
              if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                setError('Popup was blocked. Please allow popups for this site.');
                return;
              }
              
              const messageListener = (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
                  window.removeEventListener('message', messageListener);
                  popup.close();
                  
                  const { token } = event.data;
                  localStorage.setItem('token', token);
                  
                  fetch(`${apiUrl}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  })
                    .then(res => res.json())
                    .then(data => {
                      const user = (data.data || data).user || (data.data || data);
                      if (user?.id) {
                        localStorage.setItem('user', JSON.stringify(user));
                        const nextRoute = ['ADMIN', 'SUPER_ADMIN'].includes((user.role || 'USER').toUpperCase())
                          ? '/admin/dashboard'
                          : '/dashboard/spin';
                        router.replace(nextRoute);
                      }
                    })
                    .catch(() => setError('Failed to authenticate. Please try again.'));
                } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
                  window.removeEventListener('message', messageListener);
                  popup.close();
                  setError(event.data.message || 'Google authentication failed');
                }
              };
              
              window.addEventListener('message', messageListener);
            }}
            disabled={loading}
          >
            <img src="/image/google.png" alt="Google" className="google-icon" />
            Continue with Google
          </button>

          <p className="register-login">
            Already have an account?{' '}
            <span 
              onClick={() => router.push('/login')}
              style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign-In
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}