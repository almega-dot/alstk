import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('login'); // login | signup

  const resetMessage = () => setMessage('');

  const login = async () => {
    resetMessage();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(error.message);
    setLoading(false);
  };

  const signUp = async () => {
    resetMessage();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signup successful. Please check your email.');
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Stock Management System</h2>
        <p style={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to continue'
            : 'Create a new account '
            }
        </p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.toLowerCase().includes('check')
                ? styles.success
                : styles.error),
            }}
          >
            {message}
          </div>
        )}

        {mode === 'login' ? (
          <button
            onClick={login}
            disabled={loading}
            style={{
              ...styles.primaryBtn,
              ...(loading ? styles.disabledBtn : {}),
            }}
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        ) : (
          <button
            onClick={signUp}
            disabled={loading}
            style={{
              ...styles.primaryBtn,
              ...(loading ? styles.disabledBtn : {}),
            }}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        )}

        <div style={styles.switch}>
          {mode === 'login' ? (
            <>
              Don’t have an account?{' '}
              <span
                style={styles.link}
                onClick={() => {
                  resetMessage();
                  setMode('signup');
                }}
              >
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span
                style={styles.link}
                onClick={() => {
                  resetMessage();
                  setMode('login');
                }}
              >
                Login
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===============================
   HARD FIXED STYLES
=============================== */
const styles = {
  page: {
    position: 'fixed',        // 🔥 KEY FIX
    inset: 0,                 // 🔥 FULL SCREEN
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    fontFamily: 'Inter, system-ui, Arial, sans-serif',
    zIndex: 9999,             // 🔥 ABOVE EVERYTHING
  },

  card: {
    width: 380,
    padding: '32px 28px',
    borderRadius: 14,
    background: '#ffffff',
    boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
  },

  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
  },

  subtitle: {
    marginBottom: 22,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 12,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
  },

  primaryBtn: {
    width: '100%',
    padding: '10px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    background: '#2c5364',
    marginTop: 4,
  },

  disabledBtn: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },

  message: {
    padding: '8px 10px',
    fontSize: 13,
    borderRadius: 6,
    marginBottom: 10,
  },

  error: {
    background: '#ffe6e6',
    color: '#b00020',
    border: '1px solid #f5b5b5',
  },

  success: {
    background: '#e8f5e9',
    color: '#1b5e20',
    border: '1px solid #a5d6a7',
  },

  switch: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
    color: '#555',
  },

  link: {
    color: '#2c5364',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
