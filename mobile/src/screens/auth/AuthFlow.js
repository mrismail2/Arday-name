import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import RegisterSchoolScreen from './RegisterSchoolScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

/* Lightweight auth navigator (frontend-only). Switches between Login,
   Register School and Forgot Password without a real navigator, then calls
   onAuthed() once the user "logs in". */
export default function AuthFlow({ onAuthed }) {
  const [screen, setScreen] = useState('login');

  if (screen === 'register') return <RegisterSchoolScreen goLogin={() => setScreen('login')} />;
  if (screen === 'forgot') return <ForgotPasswordScreen goLogin={() => setScreen('login')} />;
  return (
    <LoginScreen
      onAuthed={onAuthed}
      goRegister={() => setScreen('register')}
      goForgot={() => setScreen('forgot')}
    />
  );
}
