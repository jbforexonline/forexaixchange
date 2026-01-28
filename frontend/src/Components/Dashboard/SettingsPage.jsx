'use client';
import React, { useState, useEffect } from 'react';
import { getCurrentUserInfo, updateProfile, changePassword } from '@/lib/api/profile';
import { getCurrentUser } from '@/lib/auth';
import '../Styles/setting.scss';

export default function SettingsPage() {
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // User data
  const [userData, setUserData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    premium: false,
  });

  // Form data for profile update
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
  });

  // Password change data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();
      
      if (user) {
        setUserData(user);
        setFormData({
          username: user.username || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Only send changed fields
      const changes = {};
      if (formData.username !== userData.username) changes.username = formData.username;
      if (formData.firstName !== userData.firstName) changes.firstName = formData.firstName;
      if (formData.lastName !== userData.lastName) changes.lastName = formData.lastName;

      if (Object.keys(changes).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save' });
        return;
      }

      const result = await updateProfile(changes);
      
      // Update local state
      const updatedUser = result.data;
      setUserData(prev => ({ ...prev, ...updatedUser }));
      setFormData({
        username: updatedUser.username || '',
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page dark">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page dark">
      <div className="header">
        <h2>My Profile</h2>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? '#22c55e' : message.type === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
        }}>
          {message.text}
        </div>
      )}

      <div className="profile-card">
        <div className="left-section">
          <div className="avatar-section">
            <div className="avatar-placeholder" style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#fff',
              margin: '0 auto 1rem',
              textTransform: 'uppercase',
            }}>
              {userData.username?.charAt(0) || 'U'}
            </div>
            <h3>{userData.username || 'User'}</h3>
            <p>{userData.role || 'Member'} {userData.premium && '⭐'}</p>
          </div>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
            </div>

            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={userData.email || 'N/A'}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={userData.phone || 'N/A'}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <button 
              type="submit" 
              className="save-btn"
              disabled={saving}
              style={{ marginTop: '1rem' }}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        <div className="right-section">
          <div className="password-section" style={{ marginTop: 0 }}>
            <h4 style={{ marginBottom: '1rem' }}>Security</h4>
            <button
              type="button"
              className="change-pass-btn"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              disabled={saving}
            >
              {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
            </button>

            {showPasswordFields && (
              <form className="password-fields" onSubmit={handleSavePassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 8 chars)"
                    minLength={8}
                    required
                  />
                  <small style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Must contain uppercase, lowercase, and number
                  </small>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    minLength={8}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="save-pass-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Password'}
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Account Information</h4>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              <p><strong>Role:</strong> {userData.role || 'USER'}</p>
              <p><strong>Status:</strong> {userData.premium ? 'Premium ⭐' : 'Standard'}</p>
              <p><strong>Member Since:</strong> {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
