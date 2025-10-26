"use client";
import Head from "next/head";
import { useRouter } from 'next/navigation';
import "../Styles/changed.scss";

export default function PasswordChanged() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Password Changed</title>
        <meta name="description" content="Password changed confirmation page" />
      </Head>

      <div className="container">
        <div className="left-pane">
          <img
            src="/image/Login.png"
            alt="Charts and Calculator"
            className="bg-image"
          />
        </div>

        <div className="right-pane">
          <div className="card" onClick={handleClick} style={{ cursor: 'pointer' }}>
            <div className="icon-wrapper">
              <div className="check-icon">✓</div>
            </div>
            <h2>Password Changed!</h2>
            <p>You can now Login to your account.</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>Click here to login</p>
          </div>
        </div>
      </div>
    </>
  );
}
