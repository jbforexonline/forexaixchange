"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    // Validate email or phone
    if (!formData.email && !formData.phone) {
      setError('Please provide either email or phone number')
      return
    }

    setLoading(true)

    try {
      // Split full name into first and last name
      const nameParts = formData.fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // Prepare username - use provided username or derive from email
      let username = formData.username
      if (!username && formData.email) {
        username = formData.email.split('@')[0]
      }
      if (!username) {
        username = formData.fullName.replace(/\s+/g, '').toLowerCase()
      }

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

      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        // Store token and user data in localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Redirect based on user role
        const role = data.user.role?.toUpperCase()
        const nextRoute = role === 'ADMIN' || role === 'SUPER_ADMIN'
          ? '/dashboard'
          : '/spin'

        router.replace(nextRoute)
      } else {
        setError(data.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      console.error('Registration error details:', err)
      setError(`Network error: ${err.message}. Please check if backend is running on ${apiUrl}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      {/* Left background */}
      <div className="register-left"></div>

      {/* Right form */}
      <div className="register-right">
        <div className="register-form-wrapper">
          <h1 className="register-title">Create an Account</h1>
          <p className="register-subtitle">
            Are you ready to join us? Let’s create Account
          </p>

          {error && (
            <div style={{
              padding: '0.8rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
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

            <label>Country</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="country-select"
              disabled={loading}
            >
              <option value="">Select country</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

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

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="register-divider">
            <span>OR</span>
          </div>

          <button className="google-btn">
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
