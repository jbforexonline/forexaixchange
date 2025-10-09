"use client"


export default function LoginPage() {
  return (
    <div className="login-container">
      {/* Left side background */}
      <div className="login-left"></div>

      {/* Right side form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <h1 className="login-title">Welcome Back!!</h1>
          <p className="login-subtitle">Please Login your Account</p>

          <form className="login-form">
            <label>Email</label>
            <input type="email" placeholder="admin@gmail.com" />

            <label>Password</label>
            <input type="password" placeholder="********" />

            <div className="login-forgot">
              <a href="#">Forgot Password</a>
            </div>

            <button type="submit" className="login-btn">Sign in</button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button className="google-btn">
            <img src="/image/google.png" alt="Google" className="google-icon" />
                Continue with Google
          </button>

          <p className="login-signup">
            Didn’t have an Account? <a href="/register">Sign-up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
