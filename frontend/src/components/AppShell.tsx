import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Bandage, Menu, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { DemoClock } from '../context/ClockContext';

const item = 'block w-full rounded p-3 text-left text-base hover:bg-sky/30';

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const nav = useNavigate();
  const go = (path: string) => {
    setOpen(false);
    nav(path);
  };

  return (
    <div className='flex min-h-screen flex-col bg-beige text-navy'>
      <header className='relative flex items-center justify-between border-b bg-white px-4 py-3'>
        <Link to='/schedule' className='flex items-center gap-2 text-xl font-semibold text-navy font-heading'>
          <Bandage /> MedFlow
        </Link>
        <button
          aria-label='Menu'
          onClick={() => setOpen(o => !o)}
          className='rounded p-2 hover:bg-sky/30'
        >
          {open ? <X /> : <Menu />}
        </button>
        {open && (
          <nav className='absolute right-4 top-14 z-20 w-56 rounded-lg border bg-white p-2 shadow-lg'>
            <button className={item} onClick={() => go('/schedule')}>Schedule</button>
            <button className={item} onClick={() => go('/medications')}>Medications</button>
            <button className={item} onClick={() => go('/profile')}>User profile</button>
            <button
              className={item}
              onClick={() => {
                setOpen(false);
                signOut();
                nav('/login');
              }}
            >
              Log out
            </button>
          </nav>
        )}
      </header>

      <main className='mx-auto w-full max-w-5xl flex-1 p-4'>
        <Outlet />
      </main>

      <footer className='border-t bg-white p-3 text-center text-sm text-teal'>
        Not medical advice. Follow your prescription and ask your pharmacist or prescriber before changing anything.
      </footer>

      <DemoClock />
      <Toaster richColors position='top-center' />
    </div>
  );
}