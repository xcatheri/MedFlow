import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bandage } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppState';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-3 text-base';

export default function Login() {
  const [isNew, setIsNew] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const { entries, profile, setProfile } = useAppState();
  const nav = useNavigate();

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (isNew && password !== confirm) return setError('Passwords do not match');
    setError('');
    setBusy(true);
    try {
      await signIn(email, password, isNew);
      if (isNew) setProfile({ ...profile, email });
      nav(isNew || entries.length === 0 ? '/medications' : '/schedule');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6'>
      <div className='flex flex-col items-center gap-1 text-teal-700'>
        <Bandage size={48} />
        <h1 className='text-3xl font-semibold'>MedFlow</h1>
        <p className='text-slate-600'>{isNew ? 'Sign up' : 'Log in'}</p>
      </div>

      <form
        className='flex flex-col gap-3'
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <label className='flex flex-col gap-1'>
          Email *
          <input className={input} type='email' value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className='flex flex-col gap-1'>
          Password *
          <input className={input} type='password' value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {isNew && (
          <label className='flex flex-col gap-1'>
            Re-enter password *
            <input className={input} type='password' value={confirm} onChange={e => setConfirm(e.target.value)} />
          </label>
        )}
        {error && <p role='alert' className='text-red-600'>{error}</p>}
        <button
          disabled={busy}
          className='rounded-lg bg-teal-600 py-3 text-white hover:bg-teal-700 disabled:opacity-50'
        >
          {busy ? 'Please wait...' : isNew ? 'Sign up' : 'Log in'}
        </button>
      </form>

      <button
        className='text-teal-700 underline'
        onClick={() => {
          setIsNew(n => !n);
          setError('');
        }}
      >
        {isNew ? 'Already have an account? Log in' : 'New here? Sign up'}
      </button>
    </div>
  );
}