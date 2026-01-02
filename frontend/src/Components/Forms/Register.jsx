"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
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
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe"
];

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    country: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralInfo, setReferralInfo] = useState(null)

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
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!formData.email && !formData.phone) {
      setError('Please provide either email or phone number')
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

      // Create request body WITHOUT country field
      const requestBody = {
        password: formData.password,
        username: username,
        firstName: firstName,
        lastName: lastName,
      }

      // Add email or phone (at least one is required)
      if (formData.email) {
        requestBody.email = formData.email
      }
      if (formData.phone) {
        requestBody.phone = formData.phone
      }

      // Add referral code if present - use 'referralCode' or 'referredBy' depending on your backend
      if (formData.referralCode) {
        // Try both field names to see which one works
        requestBody.referredBy = formData.referralCode;
        // Alternative: requestBody.referralCode = formData.referralCode;
      }

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

      const responseBody = await response.json()
      console.log('Response data:', responseBody)

      if (!response.ok) {
        // Handle validation errors better
        if (responseBody.message && Array.isArray(responseBody.message)) {
          setError(responseBody.message.join(', '))
        } else {
          setError(responseBody.message || 'Registration failed. Please try again.')
        }
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
      const nextRoute = role === 'ADMIN' || role === 'SUPER_ADMIN'
        ? '/dashboard'
        : '/spin'

      router.replace(nextRoute)
    } catch (err) {
      console.error('Registration error details:', err)
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(`Network error: ${message}. Please check if backend is running on ${apiUrl}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-left"></div>

      <div className="register-right">
        <div className="register-form-wrapper">
          <h1 className="register-title">Create an Account</h1>
          
          {formData.referralCode && (
            <div className="referral-notice">
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
            <div className="error-message">
              {error}
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit}>
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

            {/* Country field is only for display, not sent to backend */}
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
            <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '16px', display: 'block' }}>
              Country information is stored locally for your reference only
            </small>

            <label>Phone Number (optional)</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
              disabled={loading}
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
              required
              minLength="6"
              disabled={loading}
            />

            <label>Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="********"
              required
              minLength="6"
              disabled={loading}
            />

            {formData.referralCode && (
              <input
                type="hidden"
                name="referralCode"
                value={formData.referralCode}
              />
            )}

            <button type="submit" className="register-btn" disabled={loading}>
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
                          ? '/dashboard'
                          : '/spin';
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
            Already have an account? <a href="/login">Sign-In</a>
          </p>
        </div>
      </div>
    </div>
  )
}