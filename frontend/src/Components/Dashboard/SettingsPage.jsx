'use client';
import React, { useState } from 'react';
import '../Styles/setting.scss';

export default function Page() {
  const [theme, setTheme] = useState('light');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  return (
    <div className={`profile-page ${theme}`}>
      <div className="header">
        <h2>My Profile</h2>
        <div className="theme-toggle">
          <span>🌞</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            />
            <span className="slider"></span>
          </label>
          <span>🌙</span>
        </div>
      </div>

      <div className="profile-card">
        <div className="left-section">
          <div className="avatar-section">
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Profile"
            />
            <h3>Arthur Nancy</h3>
            <p>Sr. Financial Analyst</p>
          </div>

          <form className="profile-form">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" defaultValue="Arthur" />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input type="text" defaultValue="Nancy" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" defaultValue="arthur.nancy@email.com" />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input type="text" defaultValue="+1 470 046 1827" />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                defaultValue="156 Jaskolski Stravune Suite 883"
              />
            </div>

            <div className="form-group">
              <label>Nation</label>
              <input type="text" defaultValue="Colombia" />
            </div>

            <div className="password-section">
              <button
                type="button"
                className="change-pass-btn"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
              </button>

              {showPasswordFields && (
                <div className="password-fields">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" placeholder="Enter current password" />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" placeholder="Enter new password" />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Confirm new password" />
                  </div>
                  <button className="save-pass-btn">Save Password</button>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="right-section">
          <div className="form-group inline">
            <label>Gender</label>
            <select defaultValue="Male">
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          <div className="form-group inline">
            <label>Language</label>
            <select defaultValue="English">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>

          <div className="form-group inline">
            <label>Date of Birth</label>
            <div className="dob">
              <select defaultValue="September">
                <option>January</option>
                <option>September</option>
                <option>December</option>
              </select>
              <input type="number" defaultValue="31" min="1" max="31" />
              <input type="number" defaultValue="1990" min="1900" max="2025" />
            </div>
          </div>

          <div className="form-group">
            <label>Twitter</label>
            <input type="text" defaultValue="twitter.com/envato" />
          </div>

          <div className="form-group">
            <label>LinkedIn</label>
            <input type="text" defaultValue="linkedin.com/envato" />
          </div>

          <div className="form-group">
            <label>Facebook</label>
            <input type="text" defaultValue="facebook.com/envato" />
          </div>

          <div className="form-group">
            <label>Google</label>
            <input type="text" defaultValue="zachary.ruiz@gmail.com" />
          </div>

          <div className="form-group">
            <label>Slogan</label>
            <input type="text" defaultValue="Land Acquisition Specialist" />
          </div>

          <div className="withdraw-section">
            <h4>Withdraw Methods</h4>
            <div className="methods">
              <div className="method">
                
                <span>Mobile Money - 0780621151</span>
                <button>Remove</button>
              </div>

              <div className="method">
                
                <span>Visa Card - 00043 567 890</span>
                <button>Remove</button>
              </div>
            </div>

            <button className="add-method-btn">+ Add Withdraw Method</button>
          </div>

          <button className="save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
