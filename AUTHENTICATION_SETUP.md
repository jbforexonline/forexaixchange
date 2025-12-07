# Authentication Setup Guide

## ✅ Completed Features

1. **Google OAuth Integration** - Fully functional
2. **Email OTP** - Real email service integration (nodemailer)
3. **SMS OTP** - Real SMS service integration (Twilio)
4. **Password Hashing** - Secure bcrypt with 12 salt rounds
5. **Forgot Password** - Supports both email and phone
6. **Frontend Integration** - All features connected to frontend

## 🔧 Required Environment Variables

### Backend (.env file)

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

#### Email Service (Choose one)

**Option 1: Gmail**
```env
EMAIL_PROVIDER=gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Use App Password, not regular password
EMAIL_FROM=your_email@gmail.com
```

**Option 2: SendGrid**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

**Option 3: Custom SMTP**
```env
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_smtp_username
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@yourdomain.com
```

#### SMS Service (Twilio)
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

#### Frontend URL
```env
FRONTEND_URL=http://localhost:3000
```

#### App Configuration
```env
APP_NAME=ForexAI Exchange
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
```

## 📋 Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:4000/auth/google/callback`
7. Copy Client ID and Client Secret to `.env` file

### 2. Email Service Setup

#### For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use this app password (not your regular password) in `EMAIL_PASSWORD`

#### For SendGrid:
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Add the API key to `.env` as `SENDGRID_API_KEY`

### 3. SMS Service Setup (Twilio)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token from dashboard
3. Get a phone number from Twilio
4. Add credentials to `.env` file

**Note:** Twilio trial accounts have limitations. For production, upgrade your account.

### 4. Frontend Environment Variables

Create `.env.local` in frontend directory:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## 🚀 Testing

### Test Google OAuth:
1. Click "Continue with Google" on login/register page
2. Should redirect to Google consent screen
3. After approval, redirects back to app with token
4. User should be logged in automatically

### Test Email OTP:
1. Go to forgot password page
2. Enter email address
3. Check email inbox for OTP
4. Enter OTP and reset password

### Test SMS OTP:
1. Go to forgot password page
2. Enter phone number (format: +1234567890)
3. Check SMS for OTP
4. Enter OTP and reset password

## 🔒 Security Features

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **OTP Security**: 
   - Constant-time comparison (prevents timing attacks)
   - Maximum 3 verification attempts
   - 5-minute expiration
   - Rate limiting (prevents spam)
3. **JWT Tokens**: Secure token-based authentication
4. **Google OAuth**: Industry-standard OAuth 2.0 flow

## 📝 Notes

- If email/SMS services are not configured, OTP will be logged to console (development mode)
- Google OAuth users cannot use password reset (they don't have passwords)
- Password requirements: 8+ characters, uppercase, lowercase, and number
- OTP storage is in-memory (for production, consider Redis)

## 🐛 Troubleshooting

### Google OAuth not working:
- Check redirect URI matches exactly in Google Console
- Verify `GOOGLE_CALLBACK_URL` in `.env`
- Check `FRONTEND_URL` is set correctly

### Email not sending:
- For Gmail: Use App Password, not regular password
- Check email service credentials
- Check spam folder
- OTP will be logged to console if email fails

### SMS not sending:
- Verify Twilio credentials
- Check phone number format (+country code)
- Twilio trial accounts have limitations
- OTP will be logged to console if SMS fails

## ✅ All Features Integrated

- ✅ Google OAuth (frontend + backend)
- ✅ Email OTP (real service)
- ✅ SMS OTP (real service)
- ✅ Password hashing (secure)
- ✅ Forgot password (email + phone)
- ✅ Frontend integration (complete)

