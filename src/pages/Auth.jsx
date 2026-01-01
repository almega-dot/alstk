import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const signUp = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setMessage(error.message);
    else setMessage('Check your email for verification link.');
    setLoading(false);
  };

  const login = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: 'auto' }}>
      <h2>Stock App – Login / Signup</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 20 }}
      />

      <button onClick={login} disabled={loading} style={{ width: '100%' }}>
        Login
      </button>

      <div style={{ height: 10 }} />

      <button onClick={signUp} disabled={loading} style={{ width: '100%' }}>
        Sign Up
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
