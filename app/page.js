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

// Tier Pricing Structure ($250, $500, $2500)
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

  // Wikipedia Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCeleb, setSelectedCeleb] = useState(null);
  const [fullBio, setFullBio] = useState(null);
  const [isLoadingBio, setIsLoadingBio] = useState(false);

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

  // Query Wikipedia Search API (List of results)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
            searchQuery
          )}&gsrlimit=6&prop=pageimages|description&piprop=thumbnail&pithumbsize=800&format=json&origin=*`
        );
        const data = await res.json();
        
        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages).map((p) => ({
            id: p.pageid,
            name: p.title,
            description: p.description || 'Public Figure / Global Icon',
            image: p.thumbnail?.source || null,
          }));
          setSearchResults(pages);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Wiki search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Full Wikipedia Bio Details on Selection
  const handleSelectCeleb = async (celeb) => {
    setSelectedCeleb(celeb);
    setIsLoadingBio(true);
    setFullBio(null);

    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celeb.name)}`
      );
      const data = await res.json();
      setFullBio({
        extract: data.extract || 'No detailed biography available.',
        description: data.description || celeb.description,
        thumbnail: data.originalimage?.source || data.thumbnail?.source || celeb.image,
        wikiUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(celeb.name)}`
      });
    } catch (err) {
      console.error('Error fetching full bio:', err);
      setFullBio({
        extract: 'Unable to load extended Wikipedia biography.',
        description: celeb.description,
        thumbnail: celeb.image,
        wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(celeb.name)}`
      });
    } finally {
      setIsLoadingBio(false);
    }
  };

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

            {/* Step 1: Wikipedia Search */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  1. Search Global Talent Database
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
                placeholder="Type any global celebrity, artist, actor, or public figure name..."
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-sm focus:border-green-500 outline-none text-white"
              />

              {isSearching && (
                <p className="text-xs text-zinc-500 animate-pulse">Querying Wikipedia database...</p>
              )}

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {searchResults.map((celeb) => (
                    <div 
                      key={celeb.id}
                      onClick={() => handleSelectCeleb(celeb)}
                      className={`cursor-pointer bg-zinc-900 border rounded-lg overflow-hidden transition-all flex flex-col justify-between ${
                        selectedCeleb?.id === celeb.id ? 'border-green-500 ring-1 ring-green-500 bg-zinc-800/90' : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {celeb.image ? (
                        <div className="w-full h-52 bg-black flex items-center justify-center overflow-hidden">
                          <img 
                            src={celeb.image} 
                            alt={celeb.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-52 bg-zinc-950 flex items-center justify-center text-zinc-600 text-xs uppercase tracking-widest">
                          No Photo Record
                        </div>
                      )}
                      <div className="p-4 space-y-1 bg-zinc-900">
                        <h3 className="text-sm font-bold text-white line-clamp-1">{celeb.name}</h3>
                        <p className="text-xs text-zinc-400 capitalize line-clamp-2">{celeb.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Celebrity Extended Bio Card */}
              {selectedCeleb && (
                <div className="bg-zinc-900/90 border border-green-500/50 p-6 rounded-xl space-y-4 mt-6">
                  {isLoadingBio ? (
                    <p className="text-xs text-zinc-400 animate-pulse">Loading detailed Wikipedia dossier...</p>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      {fullBio?.thumbnail && (
                        <img 
                          src={fullBio.thumbnail} 
                          alt={selectedCeleb.name} 
                          className="w-full md:w-48 h-56 object-cover rounded-lg border border-zinc-700 shrink-0"
                        />
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-white">{selectedCeleb.name}</h3>
                          <a 
                            href={fullBio?.wikiUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-green-500 hover:underline"
                          >
                            View Full Wiki Article ↗
                          </a>
                        </div>
                        <p className="text-xs text-green-400 uppercase tracking-wide font-medium">{fullBio?.description}</p>
                        <p className="text-sm text-zinc-300 leading-relaxed pt-2">{fullBio?.extract}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Step 2: Tier Selection ($250, $500, $2500) */}
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

            {/* Step 3: Settlement Panel */}
            <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 space-y-6">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 text-xl font-bold">₿</span>
                  <h3 className="text-base font-bold tracking-wide">Direct Bitcoin (BTC) Settlement</h3>
                </div>
                <span className="text-xs bg-zinc-900 text-green-400 border border-zinc-800 px-3 py-1 rounded-full font-medium">
                  PR Portal VIP Treasury
                </span>
              </div>

              <div className="text-center space-y-4">
                <p className="text-xs md:text-sm text-zinc-300">
                  Scan QR Code or copy agency wallet to transfer <span className="font-bold text-white">${totalAmount.toLocaleString()} USD</span> in Bitcoin:
                </p>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-lg inline-block mx-auto">
                  <img 
                    src={qrUrl} 
                    alt="Bitcoin Wallet QR Code" 
                    className="w-48 h-48 md:w-56 md:h-56 object-contain"
                  />
                </div>

                {/* Wallet Input + Copy Button */}
                <div className="max-w-xl mx-auto flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden p-1">
                  <input 
                    type="text" 
                    readOnly 
                    value={BTC_WALLET_ADDRESS} 
                    className="bg-transparent text-green-400 font-mono text-xs md:text-sm px-3 py-2 w-full outline-none"
                  />
                  <button 
                    onClick={handleCopyWallet}
                    className="bg-green-500 hover:bg-green-400 text-black font-semibold text-xs px-4 py-2.5 rounded flex items-center space-x-1 shrink-0 transition-colors"
                  >
                    <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="max-w-xl mx-auto space-y-3">
                <input 
                  type="email" 
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Enter client email for official PR Portal documentation..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm outline-none focus:border-green-500 text-zinc-200"
                />

                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows="3"
                  placeholder="Enter custom directives, special instructions, or campaign details..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm outline-none focus:border-green-500 text-zinc-200"
                />

                <input 
                  type="text" 
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter Bitcoin Transaction Hash / TXID (optional)..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm outline-none focus:border-green-500 text-zinc-200 font-mono"
                />
              </div>

              {/* Strict PR Portal Policy Note */}
              <div className="max-w-xl mx-auto bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg text-xs text-zinc-400">
                <span className="text-red-400 font-bold">Policy Note:</span> All PR Portal VIP bookings, access fees, and retainer directives are strictly non-refundable once confirmed.
              </div>

              {/* Total & Confirmation Button */}
              <div className="max-w-xl mx-auto pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-400">Total Directive Fee</p>
                  <p className="text-2xl font-black text-green-500">${totalAmount.toLocaleString()}</p>
                </div>

                <button 
                  onClick={handleConfirmBtcTransfer}
                  disabled={isSubmitting}
                  className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-3 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <span>✓</span>
                  <span>{isSubmitting ? 'Submitting...' : 'Confirm Bitcoin Transfer'}</span>
                </button>
              </div>

            </section>

          </div>
        )}

      </div>
    </div>
  );
}