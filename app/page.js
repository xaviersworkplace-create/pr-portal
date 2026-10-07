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

// Celebrity Database Directory
const CELEBRITIES = [
  { id: '1', name: 'Burna Boy', category: 'Music / Afrobeats', image: '🎤' },
  { id: '2', name: 'Wizkid', category: 'Music / Afrobeats', image: '🦅' },
  { id: '3', name: 'Davido', category: 'Music / Afrobeats', image: '⏳' },
  { id: '4', name: 'Tems', category: 'Music / R&B', image: '✨' },
  { id: '5', name: 'Asake', category: 'Music / Afro-Fusion', image: '🚀' },
  { id: '6', name: 'Rema', category: 'Music / Rave', image: '🦇' },
];

// Tier Pricing Structure ($75, $200, $1,500)
const TIERS = [
  {
    id: 'tier-1',
    name: 'Tier I: Digital Pass',
    price: 75,
    tagline: 'Entry-Level Personal Touch',
    features: [
      'Custom 60s Video Shoutout',
      'Digital Commemorative Card',
      'Emailed Direct Video Link',
    ],
  },
  {
    id: 'tier-2',
    name: "Tier II: Collector's Vault",
    price: 200,
    tagline: 'Physical Keepsakes & Priority Access',
    features: [
      'Authenticated Physical Autograph',
      'Priority Schedule Booking',
      'Official Fan Registry Access',
    ],
  },
  {
    id: 'tier-3',
    name: 'Tier III: VIP Backstage Pass',
    price: 1500,
    tagline: 'The Ultimate Super-Fan Experience',
    features: [
      '1-on-1 Virtual Meet & Greet',
      'Professional Commemorative Portrait Session',
      'Ultimate Memorabilia Bundle',
      'Subject to Calendar & Availability',
    ],
  },
];

export default function PRPortalPage() {
  // Auth State
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Portal State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCeleb, setSelectedCeleb] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Custom Directives Calculation ($250 min when custom text provided)
  useEffect(() => {
    if (!customMessage.trim()) {
      setCustomPrice(0);
      return;
    }
    const calculated = Math.max(250, Math.round(customMessage.trim().length * 2.5));
    setCustomPrice(calculated);
  }, [customMessage]);

  const baseTierPrice = selectedTier ? selectedTier.price : 0;
  const totalAmount = baseTierPrice + customPrice;

  // Filter Celebrities
  const filteredCelebrities = CELEBRITIES.filter((celeb) =>
    celeb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    celeb.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
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

  const handlePayment = async () => {
    if (!user) {
      alert('Please sign in to execute request.');
      return;
    }
    if (!selectedCeleb) {
      alert('Please select a celebrity from the directory.');
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
        amount: totalAmount * 100, // Paystack expects cents
        currency: 'USD',
        ref: 'PR_' + Math.floor(Math.random() * 1000000000 + 1),
        callback: async (response) => {
          await fetch('/api/send-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              reference: response.reference,
              amount: totalAmount,
              details: `${selectedCeleb.name} - ${selectedTier?.name || 'Custom Request'}`
            }),
          });
          alert('Execution Confirmed! Reference: ' + response.reference);
          setIsProcessing(false);
        },
        onClose: () => setIsProcessing(false)
      });

      if (handler) {
        handler.openIframe();
      } else {
        alert('Payment gateway failed to load.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="border-b border-zinc-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-green-500">PR PORTAL</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">RESTRICTED VIP DESK • DIRECT ACCESS</p>
          </div>
          {user && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">{user.email}</p>
              <button onClick={() => auth.signOut()} className="text-xs text-red-500 hover:underline mt-1">
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Authentication Form if logged out */}
        {!user ? (
          <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold text-center">
              {isSignUp ? 'Create Account' : 'Access PR Portal'}
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
                {isSignUp ? 'CREATE ACCOUNT' : 'ACCESS PORTAL'}
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
              {isSignUp ? 'Already registered?' : 'Need credentials?'}{' '}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-green-500 hover:underline">
                {isSignUp ? 'Sign In' : 'Register Account'}
              </button>
            </p>
          </div>
        ) : (
          /* Main VIP Portal Interface */
          <div className="space-y-10">

            {/* Step 1: Celebrity Search */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  1. Select Talent Target
                </h2>
                {selectedCeleb && (
                  <span className="text-xs text-green-500 font-semibold">
                    Selected: {selectedCeleb.name}
                  </span>
                )}
              </div>

              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search celebrity roster by name or category..."
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-sm focus:border-green-500 outline-none"
              />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCelebrities.map((celeb) => (
                  <div 
                    key={celeb.id}
                    onClick={() => setSelectedCeleb(celeb)}
                    className={`cursor-pointer bg-zinc-900 border p-4 rounded-lg flex items-center space-x-3 transition-colors ${
                      selectedCeleb?.id === celeb.id ? 'border-green-500 bg-zinc-800/80' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-2xl">{celeb.image}</span>
                    <div>
                      <h3 className="text-sm font-bold">{celeb.name}</h3>
                      <p className="text-xs text-zinc-500">{celeb.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 2: Tiers Selection ($75, $200, $1500) */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                2. Choose Engagement Tier
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {TIERS.map((tier) => (
                  <div 
                    key={tier.id}
                    onClick={() => setSelectedTier(selectedTier?.id === tier.id ? null : tier)}
                    className={`cursor-pointer bg-zinc-900 border p-6 rounded-lg space-y-4 flex flex-col justify-between transition-colors ${
                      selectedTier?.id === tier.id ? 'border-green-500 bg-zinc-800/80' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <h3 className="text-base font-bold text-white">{tier.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{tier.tagline}</p>
                      <div className="text-2xl font-extrabold text-green-500 mt-3">${tier.price}</div>
                      
                      <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                        {tier.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                      selectedTier?.id === tier.id 
                        ? 'bg-green-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}>
                      {selectedTier?.id === tier.id ? 'Selected' : 'Select Tier'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 3: Custom Directives & Checkout */}
            <section className="grid md:grid-cols-3 gap-8 pt-4 border-t border-zinc-800">
              
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  3. Custom Directives / Requirements (Optional)
                </h2>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows="4"
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-sm focus:border-green-500 outline-none text-zinc-200"
                  placeholder="Specify occasions, custom names, or special campaign requests ($250 base directive fee applies if added)..."
                />
              </div>

              {/* Execution Summary Box */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-6 h-fit">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-3">
                  Execution Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Target:</span>
                    <span className="text-white font-medium">{selectedCeleb ? selectedCeleb.name : 'None'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Tier Package:</span>
                    <span className="text-white font-medium">${baseTierPrice}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Custom Directives:</span>
                    <span className="text-white font-medium">${customPrice}</span>
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
                  {isProcessing ? 'PROCESSING...' : `EXECUTE DIRECTIVE ($${totalAmount})`}
                </button>
              </div>

            </section>

          </div>
        )}

      </div>
    </div>
  );
}