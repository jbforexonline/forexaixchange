# Authentication Testing Guide

## ✅ What's Integrated

All authentication features are fully integrated and ready to test:

1. **Google OAuth** - Login/Register with Google
2. **Email OTP** - Password reset via email
3. **Password Hashing** - Secure bcrypt (12 rounds)
4. **Forgot Password** - Email and phone support
5. **Frontend Integration** - All UI connected

## 🚀 Starting the Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Backend will run on: `http://localhost:4000`
Frontend will run on: `http://localhost:3000`

## 📋 Testing Checklist

### 1. Test Registration (Email/Password)

**Steps:**
1. Go to `http://localhost:3000/register`
2. Fill in the form:
   - Full name: `John Doe`
   - Username: `johndoe`
   - Email: `your-email@gmail.com`
   - Password: `TestPass123` (must have uppercase, lowercase, number)
3. Click "Create Account"

**Expected Result:**
- User should be created
- Redirected to dashboard or spin page
- Token stored in localStorage

### 2. Test Google OAuth Login

**Steps:**
1. Go to `http://localhost:3000/login`
2. Click "Continue with Google" button
3. Should redirect to Google consent screen
4. Approve the consent
5. Should redirect back to `http://localhost:3000/auth/callback`

**Expected Result:**
- User authenticated via Google
- Token received and stored
- Redirected to dashboard or spin page
- User data in localStorage

**Requirements:**
- `GOOGLE_CLIENT_ID` must be set in backend `.env`
- `GOOGLE_CLIENT_SECRET` must be set
- `GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback`
- `FRONTEND_URL=http://localhost:3000`

### 3. Test Google OAuth Registration

**Steps:**
1. Go to `http://localhost:3000/register`
2. Click "Continue with Google" button
3. Same flow as login

**Expected Result:**
- New user created with Google account
- Username auto-generated from email
- Wallet created automatically
- No password set (Google OAuth user)

### 4. Test Forgot Password (Email)

**Steps:**
1. Go to `http://localhost:3000/forgetpassword`
2. Enter your email: `your-email@gmail.com`
3. Click "Send OTP"
4. Check your email inbox for OTP code
5. Enter the 6-digit OTP code
6. Enter new password: `NewPass123`
7. Confirm password: `NewPass123`
8. Click "Reset Password"

**Expected Result:**
- OTP sent to email (check spam folder)
- OTP verified successfully
- Password updated
- Can login with new password

**Email Service Requirements:**
- If using Gmail: `EMAIL_USER` and `EMAIL_PASSWORD` (app password) must be set
- If not configured: OTP will be logged to backend console

### 5. Test Forgot Password (Phone) - Future

**Note:** SMS is not configured yet (you mentioned implementing later). 
For now, if you enter a phone number, OTP will be logged to console.

**Steps:**
1. Go to `http://localhost:3000/forgetpassword`
2. Enter phone: `+1234567890`
3. Click "Send OTP"
4. Check backend console for OTP (since Twilio not configured)
5. Enter the OTP and reset password

### 6. Test Login

**Steps:**
1. Go to `http://localhost:3000/login`
2. Enter email or phone: `your-email@gmail.com`
3. Enter password: `TestPass123`
4. Click "Sign in"

**Expected Result:**
- User authenticated
- Redirected to appropriate page based on role
- Token and user data stored

### 7. Test Password Validation

**Steps:**
1. Try to register/reset password with weak passwords:
   - `test` - Too short
   - `testtest` - No uppercase or number
   - `TESTTEST` - No lowercase or number
   - `TestTest` - No number
   - `TestPass123` - ✅ Valid

**Expected Result:**
- Weak passwords rejected with clear error messages
- Valid password accepted

## 🔍 Checking Backend Logs

Watch the backend terminal for logs:

### Successful Email OTP:
```
✅ OTP email sent successfully to user@example.com. Message ID: <message-id>
```

### Email Not Configured (Development):
```
Email service not configured. OTP for user@example.com: 123456
╔═══════════════════════════════════════╗
║  Email: user@example.com              ║
║  OTP Code: 123456                     ║
╚═══════════════════════════════════════╝
```

### Google OAuth Success:
```
[AuthService] User authenticated via Google: user@example.com
```

### Google OAuth User Created:
```
[AuthService] New user created via Google: user@example.com
```

## 🐛 Common Issues

### Google OAuth: "Redirect URI mismatch"
- Check `GOOGLE_CALLBACK_URL` in `.env`
- Must match exactly in Google Cloud Console
- Should be: `http://localhost:4000/auth/google/callback`

### Email OTP Not Received
1. Check backend logs for error messages
2. If using Gmail: Make sure you're using App Password, not regular password
3. Check spam folder
4. If not configured: OTP will be in backend console

### "Invalid token" after Google OAuth
- Check `JWT_SECRET` is set in `.env`
- Token expiration might have passed
- Try logging in again

### Password Reset: "OTP already exists"
- Wait 5 minutes for OTP to expire
- This is rate limiting working correctly

## 📊 Testing Scenarios Matrix

| Feature | Email | Phone | Google | Status |
|---------|-------|-------|--------|--------|
| Register | ✅ | ✅ | ✅ | Working |
| Login | ✅ | ✅ | ✅ | Working |
| Forgot Password | ✅ | ⏳ | ❌ | Email works, SMS pending |
| Password Validation | ✅ | ✅ | N/A | Working |
| OTP Security | ✅ | ⏳ | N/A | Working |

✅ = Ready to test
⏳ = Implemented but needs configuration (SMS)
❌ = Not applicable

## 🔐 Security Features to Verify

1. **Password Hashing**: Passwords never visible in responses
2. **OTP Expiration**: OTP expires after 5 minutes
3. **Rate Limiting**: Can't request new OTP within expiration window
4. **Max Attempts**: Only 3 OTP verification attempts
5. **Google OAuth Protection**: Google users can't use password reset
6. **JWT Tokens**: Secure token-based authentication

## 📝 Next Steps After Testing

1. Configure production email service (Gmail/SendGrid)
2. Set up Twilio for SMS (when needed)
3. Configure Google OAuth production credentials
4. Test with real users
5. Monitor logs for errors

## ✅ All Features Ready

- ✅ Google OAuth integrated (frontend + backend)
- ✅ Email OTP working (with fallback to console)
- ✅ SMS OTP prepared (awaiting Twilio config)
- ✅ Password hashing secure
- ✅ Forgot password fully functional
- ✅ Frontend fully connected

**Start both backend and frontend, then test the features!**

