'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';

// Firebase Client Initialization
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function PRPortalPage() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Selection & Pricing State
  const [selectedTier, setSelectedTier] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customPrice, setCustomPrice] = useState(250);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fixed Custom Directives Calculation
  useEffect(() => {
    // If empty, defaults to 250. Otherwise calculates max between 250 and character count * 2.5
    const calculated = !customMessage.trim() 
      ? 250 
      : Math.max(250, Math.round(customMessage.trim().length * 2.5));
    setCustomPrice(calculated);
  }, [customMessage]);

  const baseTierPrice = selectedTier ? selectedTier.price : 0;
  const totalAmount = baseTierPrice + customPrice;

  // Authentication Handlers
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  // Payment Handler
  const handlePayment = async () => {
    if (!user) {
      alert('Please sign in to proceed with your order.');
      return;
    }

    if (totalAmount <= 0) {
      alert('Please select a tier or enter custom directives.');
      return;
    }

    setIsProcessing(true);

    try {
      const handler = window.PaystackPop && window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: totalAmount * 100, // Paystack expects kobo/cents
        currency: 'USD',
        ref: 'PR_' + Math.floor(Math.random() * 1000000000 + 1),
        callback: async (response) => {
          // Send Email Receipt via Resend API Route
          await fetch('/api/send-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              reference: response.reference,
              amount: totalAmount,
              details: customMessage || selectedTier?.name || 'Standard VIP Package'
            }),
          });
          alert('Payment Successful! Reference: ' + response.reference);
          setIsProcessing(false);
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });

      if (handler) {
        handler.openIframe();
      } else {
        alert('Paystack SDK failed to load. Please refresh.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-zinc-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-green-500">PR PORTAL</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">RESTRICTED VIP DESK • SIGN IN REQUIRED</p>
          </div>
          {user && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">{user.email}</p>
              <button 
                onClick={() => auth.signOut()} 
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Auth Section if not logged in */}
        {!user ? (
          <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold text-center">
              {isSignUp ? 'Create Account' : 'Access Portal'}
            </h2>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/50 p-2 rounded border border-red-800">{authError}</p>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-sm focus:border-green-500 outline-none"
                  placeholder="client@prportal.com"
                  required 
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">PASSWORD</label>
                <input 
                  type="password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-sm focus:border-green-500 outline-none"
                  placeholder="••••••••"
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-green-500 text-black font-semibold p-2 rounded hover:bg-green-400 text-sm tracking-wide"
              >
                {isSignUp ? 'CREATE ACCOUNT' : 'ACCESS PR PORTAL'}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">OR</span></div>
            </div>

            <button 
              onClick={handleGoogleAuth}
              className="w-full border border-zinc-700 p-2 rounded hover:bg-zinc-800 text-sm font-medium"
            >
              CONTINUE WITH GOOGLE
            </button>

            <p className="text-center text-xs text-zinc-500 mt-4">
              {isSignUp ? 'Already have access?' : 'Need client credentials?'}{' '}
              <button 
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-green-500 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Register Account'}
              </button>
            </p>
          </div>
        ) : (
          /* Main Portal UI */
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Input Directives Column */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Custom Directives */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  Custom PR Directives
                </h3>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows="5"
                  className="w-full bg-black border border-zinc-800 p-3 rounded text-sm focus:border-green-500 outline-none text-zinc-200"
                  placeholder="Enter specific outreach goals, target media outlets, or custom campaign requirements..."
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Base Minimum Rate: $250</span>
                  <span>Calculated: ${customPrice}</span>
                </div>
              </div>

            </div>

            {/* Order Summary & Checkout Column */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-6 h-fit">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-3">
                Execution Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Custom Directives:</span>
                  <span className="text-white">${customPrice}</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex justify-between font-semibold text-base">
                  <span>Total Investment:</span>
                  <span className="text-green-500">${totalAmount}</span>
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded tracking-wider text-sm disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'INITIALIZING TRANSACTION...' : `EXECUTE DIRECTIVE ($${totalAmount})`}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}