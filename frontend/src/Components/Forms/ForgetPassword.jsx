"use client";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import "../Styles/ForgetPassword.scss";

export default function ForgetPassword() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    newPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", form);
    // Redirect to the Changed page after form submission
    router.push('/Changed');
  };

  return (
    <div className="forget-page">
      <div className="image-side">
        <img src="/image/Login.png" alt="background" />
      </div>

      <div className="form-side">
        <div className="form-wrapper">
          <h2>Forget Password</h2>
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@gmail.com"
              required
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              required
            />

            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="********"
              required
            />

            <button type="submit">Next</button>
          </form>
        </div>
      </div>
    </div>
  );
}
