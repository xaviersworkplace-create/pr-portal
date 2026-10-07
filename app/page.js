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

const BTC_WALLET_ADDRESS = 'bc1qugpvyyzhync7sr39kvuwudzxfypydnj34gxu8';

// Tier Pricing Structure ($250, $500, $2,500)
const TIERS = [
  {
    id: 'tier-1',
    name: 'Tier I: Digital Pass',
    price: 250,
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
    price: 500,
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
    price: 2500,
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

  // Wikipedia Celebrity Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCeleb, setSelectedCeleb] = useState(null);

  // Selection & Form State
  const [selectedTier, setSelectedTier] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [clientEmail, setClientEmail] = useState('');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) setClientEmail(currentUser.email);
    });
    return () => unsubscribe();
  }, []);

  // Custom Directives Calculation
  useEffect(() => {
    if (!customMessage.trim()) {
      setCustomPrice(0);
      return;
    }
    const calculated = Math.max(250, Math.round(customMessage.trim().length * 2.5));
    setCustomPrice(calculated);
  }, [customMessage]);

  // Strict Wikipedia Celebrity Search API Logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSelectedCeleb(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Fetch candidate titles via opensearch (strict title prefixing)
        const openRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
            searchQuery
          )}&limit=10&namespace=0&format=json&origin=*`
        );
        const openData = await openRes.json();
        const candidateTitles = openData[1] || [];

        let matchedCeleb = null;

        // Loop candidate titles to find the primary celebrity profile
        for (const title of candidateTitles) {
          // Skip lists, disambiguation pages, filmography, and non-person entries
          const lowerTitle = title.toLowerCase();
          if (
            lowerTitle.startsWith('list of') ||
            lowerTitle.includes('discography') ||
            lowerTitle.includes('filmography') ||
            lowerTitle.includes('members') ||
            lowerTitle.includes('(film)') ||
            lowerTitle.includes('(album)') ||
            lowerTitle.includes('(song)')
          ) {
            continue;
          }

          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          );
          if (!summaryRes.ok) continue;

          const summary = await summaryRes.json();

          // Ensure it is a standard page, not disambiguation or list
          if (summary.type === 'standard') {
            matchedCeleb = {
              name: summary.title,
              description: summary.description || 'Public Figure / Global Icon',
              extract: summary.extract || 'No detailed biography extract available.',
              image: summary.originalimage?.source || summary.thumbnail?.source || null,
              wikiUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`
            };
            break; // Stop at first valid celebrity match
          }
        }

        setSelectedCeleb(matchedCeleb);
      } catch (err) {
        console.error('Wiki celebrity search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const baseTierPrice = selectedTier ? selectedTier.price : 0;
  const totalAmount = baseTierPrice + customPrice;

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(BTC_WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmBtcTransfer = async () => {
    if (!user) {
      alert('Please sign in to execute request.');
      return;
    }
    if (!selectedCeleb) {
      alert('Please search and select a target celebrity.');
      return;
    }
    if (totalAmount <= 0) {
      alert('Please select a tier package or enter custom directives.');
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail || user.email,
          txHash: txHash || 'Pending Verification',
          amount: totalAmount,
          details: `${selectedCeleb.name} - ${selectedTier?.name || 'Custom Directive'}`
        }),
      });

      alert(`Transfer Submitted! Total: $${totalAmount.toLocaleString()} USD. Directives queued for VIP execution.`);
      setIsSubmitting(false);
    } catch (error) {
      console.error(error);
      alert('Submission received.');
      setIsSubmitting(false);
    }
  };

  // Auth Handlers
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${BTC_WALLET_ADDRESS}`;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        
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

        {!user ? (
          /* Auth Form */
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
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-sm focus:border-green-500 outline-none text-white"
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
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-sm focus:border-green-500 outline-none text-white"
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
          /* VIP Portal Interface */
          <div className="space-y-10">

            {/* Step 1: Celebrity Search */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  1. Search Global Talent Database
                </h2>
                {selectedCeleb && (
                  <span className="text-xs text-green-500 font-semibold">
                    Target Verified
                  </span>
                )}
              </div>

              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type celebrity name (e.g. Chris Brown, Tom Holland, Drake)..."
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm focus:border-green-500 outline-none text-white"
              />

              {isSearching && (
                <p className="text-xs text-zinc-500 animate-pulse">Filtering celebrity profiles...</p>
              )}

              {/* Single Celeb Dossier Card */}
              {selectedCeleb && !isSearching && (
                <div className="bg-zinc-900 border border-green-500/80 rounded-xl overflow-hidden p-6 space-y-4 shadow-lg">
                  {selectedCeleb.image && (
                    <div className="w-full h-80 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={selectedCeleb.image} 
                        alt={selectedCeleb.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold text-white">{selectedCeleb.name}</h3>
                      <a 
                        href={selectedCeleb.wikiUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-green-500 hover:underline font-medium"
                      >
                        View Full Wiki Article ↗
                      </a>
                    </div>

                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                      {selectedCeleb.description}
                    </p>

                    <p className="text-sm text-zinc-300 leading-relaxed pt-2">
                      {selectedCeleb.extract}
                    </p>
                  </div>
                </div>
              )}
            </section>