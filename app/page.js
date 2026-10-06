'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Copy, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck,
  X,
  Check,
  QrCode,
  LogOut,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Clock,
  Globe
} from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, googleProvider } from './firebase';

const BTC_WALLET = "bc1qugpvyyzhync7sr39kvuwuwdzxfypydnj34gxu8";

const PRICING_TIERS = [
  {
    id: 'tier-1',
    name: 'Tier I – Premium Access',
    price: 2500,
    subtitle: 'Scheduled private access with supervised meeting and commemorative perks.',
    perks: [
      'One (1) official autograph',
      'Professional commemorative photographs',
      'Twelve (12) hours of scheduled private access',
      'Professionally supervised meeting with coordinated scheduling & time management'
    ]
  },
  {
    id: 'tier-2',
    name: 'Tier II – Executive Access',
    price: 5000,
    subtitle: 'Extended consecutive access with official Fan Club recognition & priority.',
    perks: [
      'Twenty-four (24) consecutive hours of scheduled access',
      'Official Fan Club Membership Identification (Executive Supporter status)',
      'Priority scheduling and coordination (subject to availability & security protocols)'
    ]
  },
  {
    id: 'tier-3',
    name: 'Tier III – Elite All-Access Experience',
    price: 10000,
    subtitle: 'Ultimate VIP experience including private getaway, guests, and full privileges.',
    perks: [
      'Includes all Tier I and Tier II benefits',
      'Unlimited scheduled video & audio communication (subject to reasonable availability)',
      'Official VIP Credentials for authorized entry into designated restricted areas',
      'Private meet and a weekend vacation in a secure, professionally managed environment',
      'Permission to invite up to two (2) guests to share the VIP experience',
      'Premium food and beverage hospitality during designated VIP sessions',
      'Personal VIP escort with priority scheduling for a seamless & secure experience'
    ]
  },
  {
    id: 'tier-4',
    name: 'Tier IV – Sovereign Presidential Access',
    price: 25000,
    subtitle: 'Unrestricted retainer access, custom campaign routing, and top-tier global placement.',
    perks: [
      'Includes all Tier I, II, and III elite privileges',
      'Direct 24/7 priority concierge and talent management agency access',
      'Guaranteed primary press distribution and global PR campaign rollout',
      'Unrestricted private travel arrangements & executive protection detail',
      'Customized non-disclosure agreement (NDA) and exclusive representation protocol'
    ]
  }
];

export default function PRPortalPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [copied, setCopied] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Verification & Settlement Form State
  const [clientEmail, setClientEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) setClientEmail(currentUser.email);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Custom Directives Calculation
  useEffect(() => {
    if (!customMessage.trim()) {
      setCustomPrice(0);
      return;
    }
    const calculated = Math.max(250, Math.round(customMessage.length * 2.5));
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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Confirm Bitcoin Settlement Submission & Dispatch Email
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!clientEmail) {
      setPaymentError("Please enter client email for official PR PORTAL documentation.");
      return;
    }

    if (totalAmount <= 0) {
      setPaymentError("Please select a VIP Access Tier or enter custom directives before submitting.");
      return;
    }

    setSubmittingPayment(true);

    try {
      let statusString = 'Pending Manual Verification';
      let cleanTxHash = txHash.trim().toLowerCase();

      if (cleanTxHash) {
        const res = await fetch(`https://mempool.space/api/address/${BTC_WALLET}/txs`);
        if (res.ok) {
          const transactions = await res.json();
          const matchedTx = transactions.find((tx) => tx.txid.toLowerCase() === cleanTxHash);
          if (matchedTx) {
            statusString = matchedTx.status.confirmed ? 'Confirmed On-Chain' : 'Unconfirmed / Pending Block Inclusion';
          }
        }
      } else {
        cleanTxHash = 'Not Provided / Manual Verification Required';
      }

      // 1. Save booking to Firestore database
      await addDoc(collection(db, 'bookings'), {
        userId: user.uid,
        clientEmail,
        specialInstructions: specialInstructions || 'None',
        selectedTalent: selectedTalent ? selectedTalent.name : 'General VIP Directory',
        selectedTier: selectedTier ? selectedTier.name : 'Custom Directives Only',
        totalAmountUSD: totalAmount,
        customMessage: customMessage || 'None',
        txHash: cleanTxHash,
        btcWallet: BTC_WALLET,
        status: statusString,
        createdAt: serverTimestamp()
      });

      // 2. Dispatch automated HTML receipt & onboarding guide to client email
      try {
        await fetch('/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail,
            selectedTalent: selectedTalent ? selectedTalent.name : 'General VIP Directory',
            selectedTier: selectedTier ? selectedTier.name : 'Custom Directives Only',
            totalAmountUSD: totalAmount,
            specialInstructions: specialInstructions || customMessage || 'None',
            txHash: cleanTxHash,
          }),
        });
      } catch (emailErr) {
        console.error("Email dispatch failed:", emailErr);
      }

      setPaymentSuccess(true);
    } catch (err) {
      console.error("Submission error:", err);
      setPaymentError(err.message || "Failed to submit settlement record.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Wikipedia Search Execution
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setIsDropdownOpen(true);

    try {
      const primaryUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=1&format=json&origin=*`;
      let res = await fetch(primaryUrl);
      let data = await res.json();
      let results = data.query?.search || [];

      if (results.length === 0) {
        const fallbackUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=10&format=json&origin=*`;
        const fbRes = await fetch(fallbackUrl);
        const fbData = await fbRes.json();
        if (fbData && fbData[1]) {
          results = fbData[1].map((title, idx) => ({
            id: idx,
            name: title,
            snippet: fbData[2][idx] || `Verified entry for ${title}`
          }));
        }
      } else {
        results = results.map((item) => ({
          id: item.pageid,
          name: item.title,
          snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
        }));
      }

      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectTalent = async (talent) => {
    setSearchLoading(true);
    setIsDropdownOpen(false);
    try {
      const pageRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(talent.name)}`);
      if (pageRes.ok) {
        const pageData = await pageRes.json();
        setSelectedTalent({
          id: talent.id,
          name: pageData.title || talent.name,
          snippet: pageData.extract || talent.snippet,
          image: pageData.originalimage?.source || pageData.thumbnail?.source || null,
          description: pageData.description || 'Verified Public Figure'
        });
      } else {
        setSelectedTalent(talent);
      }
    } catch (err) {
      setSelectedTalent(talent);
    } finally {
      setSearchLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(BTC_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=bitcoin:${BTC_WALLET}`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-sm font-mono text-[#00e676]">
        Authenticating PR PORTAL...
      </div>
    );
  }

  // Restricted Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex items-center justify-center px-6 py-12">
        <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 bg-[#00e676] text-black rounded-full flex items-center justify-center font-black text-xl">
                <Globe className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight uppercase">PR PORTAL</span>
            </div>
            <p className="text-xs text-[#00e676] font-mono tracking-wider">RESTRICTED VIP DESK • SIGN IN REQUIRED</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="text-xs text-[#8e9bae] font-semibold uppercase tracking-wider block mb-1">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="client@prportal.com"
                  className="w-full bg-[#07090e] border border-[#1b2538] focus:border-[#00e676] text-white p-3 pl-10 rounded-lg outline-none text-xs transition-colors"
                />
                <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#8e9bae] font-semibold uppercase tracking-wider block mb-1">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#07090e] border border-[#1b2538] focus:border-[#00e676] text-white p-3 pl-10 rounded-lg outline-none text-xs transition-colors"
                />
                <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#00e676] text-black font-extrabold py-3 text-xs uppercase tracking-widest rounded-lg hover:bg-[#00c853] transition-colors"
            >
              {isSignUp ? 'Register Client Account' : 'Access PR PORTAL'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#1b2538] w-full"></div>
            <span className="bg-[#0e131f] px-3 text-[10px] text-[#64748b] uppercase tracking-widest font-mono shrink-0">or</span>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full bg-[#07090e] border border-[#1b2538] text-white font-semibold py-3 text-xs uppercase tracking-wider rounded-lg hover:bg-[#131b2c] transition-colors flex items-center justify-center gap-2"
          >
            <span>Continue with Google</span>
          </button>

          <div className="text-center pt-2">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-[#8e9bae] hover:text-[#00e676] transition-colors"
            >
              {isSignUp ? 'Already registered? Sign In' : 'Need client credentials? Register Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased selection:bg-[#00e676] selection:text-black">
      
      {/* PR PORTAL Top Navigation */}
      <header className="border-b border-[#1b2538] bg-[#07090e]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#00e676] text-black rounded-full flex items-center justify-center font-black">
              <Globe className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white uppercase block leading-none">
                  PR PORTAL
                </span>
                <span className="bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                  EST. 1982
                </span>
              </div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider font-mono mt-1 block">
                Talent Management & VIP Security Services
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-[#0e131f] border border-[#1b2538] px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono text-[#00e676]">
              <QrCode className="w-3.5 h-3.5" />
              <span>Portal QR</span>
            </div>

            <div className="bg-[#0e131f] border border-[#1b2538] px-3.5 py-1.5 rounded-full text-xs font-mono text-white">
              USD ($)
            </div>

            <button 
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 text-xs text-[#8e9bae] hover:text-white border border-[#1b2538] bg-[#0e131f] px-3 py-1.5 rounded-full transition-colors ml-2"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* Banner Card */}
        <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#131b2c] border border-[#1b2538] rounded-xl shrink-0 text-[#00e676]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-white">ESTABLISHED IN 1982</h1>
              <p className="text-xs text-[#8e9bae] max-w-2xl mt-1 leading-relaxed">
                For over four decades, PR PORTAL has served as a premiere international talent management and security brokerage firm representing high-profile public figures, creators, and executive leaders globally.
              </p>
            </div>
          </div>

          <a 
            href="mailto:contact@prportal.com" 
            className="bg-[#131b2c] hover:bg-[#1b2538] border border-[#1b2538] px-4 py-2.5 rounded-xl text-xs font-mono text-white flex items-center gap-2 transition-colors shrink-0"
          >
            <Mail className="w-3.5 h-3.5 text-[#00e676]" />
            <span>contact@prportal.com</span>
          </a>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                placeholder="Search PR PORTAL Talent Directory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
                className="w-full bg-[#0e131f] border border-[#1b2538] focus:border-[#00e676] text-white px-4 py-3.5 pl-11 rounded-xl outline-none transition-all placeholder:text-[#475569] text-sm"
              />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
            </div>
            <button 
              type="submit"
              className="bg-[#00e676] text-black font-extrabold px-6 py-3.5 text-xs uppercase tracking-wider rounded-xl hover:bg-[#00c853] transition-colors shrink-0"
            >
              {searchLoading ? 'Searching...' : 'Search Directory'}
            </button>
          </form>

          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 border border-[#1b2538] rounded-xl divide-y divide-[#131b2c] bg-[#0b0f19] shadow-2xl z-40 max-h-72 overflow-y-auto">
              <div className="p-2.5 bg-[#07090e] flex justify-between items-center text-[10px] text-[#64748b] uppercase tracking-wider font-mono border-b border-[#1b2538]">
                <span>Results ({searchResults.length})</span>
                <button onClick={() => setIsDropdownOpen(false)} className="hover:text-white flex items-center gap-1">
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
              {searchResults.map((talent) => (
                <div 
                  key={talent.id}
                  onClick={() => handleSelectTalent(talent)}
                  className="p-3.5 cursor-pointer transition-colors hover:bg-[#131b2c] flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-white text-sm">{talent.name}</h3>
                    <p className="text-xs text-[#64748b] line-clamp-1 mt-0.5">{talent.snippet}</p>
                  </div>
                  <UserCheck className="w-4 h-4 text-[#00e676]" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directory & Settlement Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          
          {/* Left Column: Selected Talent Profile */}
          <section className="lg:col-span-5 space-y-6">
            {selectedTalent ? (
              <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00e676] bg-[#07090e] px-2.5 py-1 rounded border border-[#1b2538]">
                    {selectedTalent.description || 'Verified Public Figure'}
                  </span>
                  <button 
                    onClick={() => setSelectedTalent(null)}
                    className="text-xs text-[#64748b] hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>

                {selectedTalent.image && (
                  <div className="w-full max-h-80 bg-[#07090e] border border-[#1b2538] rounded-xl p-2 flex items-center justify-center overflow-hidden">
                    <img 
                      src={selectedTalent.image} 
                      alt={selectedTalent.name} 
                      className="max-h-72 w-auto object-contain rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">{selectedTalent.name}</h2>
                  <p className="text-xs text-[#8e9bae] leading-relaxed line-clamp-6">
                    {selectedTalent.snippet}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-8 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-[#00e676] mx-auto" />
                <h3 className="text-sm font-semibold text-white">No Talent Selected</h3>
                <p className="text-xs text-[#64748b]">Search the PR PORTAL Directory above to select a represented figure for direct booking.</p>
              </div>
            )}

            <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-5 space-y-3 text-xs text-[#8e9bae]">
              <h4 className="font-semibold text-[#00e676] uppercase tracking-wider text-[11px]">PR PORTAL Regulations & Policy</h4>
              <ul className="space-y-2 list-disc pl-4 text-[11px] leading-relaxed">
                <li>All privileges are subject to management approval, security requirements, and scheduling availability.</li>
                <li>
                  <strong className="text-white">Refund Policy:</strong> All retainer allocations, placement fees, and access bookings are <strong className="text-white">100% Non-Refundable</strong> once access has been officially confirmed and processed.
                </li>
              </ul>
            </div>
          </section>

          {/* Right Column: Pricing Tiers & Bitcoin Settlement Block */}
          <section className="lg:col-span-7 space-y-6">
            
            <div className="flex justify-between items-center border-b border-[#1b2538] pb-3">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Select VIP Access Tier</h2>
                <p className="text-xs text-[#64748b]">Click a tier to select or unselect. Custom directives can be submitted separately below.</p>
              </div>
              <span className="text-xs font-mono text-[#00e676]">USD ($)</span>
            </div>

            {/* Tier Cards */}
            <div className="space-y-4">
              {PRICING_TIERS.map((tier) => {
                const isSelected = selectedTier?.id === tier.id;
                return (
                  <div 
                    key={tier.id}
                    onClick={() => setSelectedTier(isSelected ? null : tier)}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#00e676] bg-[#0e131f] shadow-lg ring-1 ring-[#00e676]' 
                        : 'border-[#1b2538] bg-[#0b0f19] hover:border-[#2d3b54]'
                    }`}
                  >
                    <div className="flex justify-between items-start border-b border-[#1b2538] pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{tier.name}</h3>
                          {isSelected && (
                            <span className="text-[10px] bg-[#00e676] text-black px-2 py-0.5 font-bold uppercase rounded-full">Selected</span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b] mt-0.5">{tier.subtitle}</p>
                      </div>
                      <span className="font-mono text-lg font-bold text-white shrink-0 ml-4">
                        ${tier.price.toLocaleString()}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {tier.perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-[#a0aec0]">
                          <Check className="w-3.5 h-3.5 text-[#00e676] shrink-0 mt-0.5" />
                          <span className="leading-tight">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Custom Scope Field */}
            <div className="bg-[#0e131f] border border-[#1b2538] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Custom Directives / Special Scope
                </label>
                {customPrice > 0 && (
                  <span className="text-xs font-mono text-[#00e676] bg-[#07090e] px-2.5 py-1 rounded border border-[#1b2538]">
                    Custom Fee: +${customPrice.toLocaleString()} USD
                  </span>
                )}
              </div>
              <textarea 
                rows={3}
                placeholder="Enter custom request notes... (Minimum charge: $250. Can be used with or without a package tier above)"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-[#07090e] border border-[#1b2538] focus:border-[#00e676] text-white p-3.5 rounded-xl outline-none transition-all placeholder:text-[#475569] text-xs"
              />
            </div>

            {/* Direct Bitcoin (BTC) Settlement Block */}
            <div className="bg-[#0a0e1a] border border-[#1b2538] rounded-2xl p-6 space-y-5 shadow-2xl">
              
              {/* Top Header Row */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1b2538]">
                <div className="flex items-center gap-2">
                  <span className="text-[#00e676] text-xl font-black">₿</span>
                  <h2 className="text-lg font-bold text-white tracking-wide">Direct Bitcoin (BTC) Settlement</h2>
                </div>
                <span className="bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 text-xs font-mono font-semibold px-3 py-1 rounded-full">
                  PR PORTAL
                </span>
              </div>

              {/* QR Code and Wallet Box */}
              <div className="bg-[#0e1422] border border-[#1b2538] rounded-xl p-6 text-center space-y-4">
                <p className="text-xs text-[#8e9bae]">
                  Scan QR Code or copy agency wallet to transfer{' '}
                  <strong className="text-white font-mono">
                    ${totalAmount.toLocaleString()} USD
                  </strong>{' '}
                  in Bitcoin:
                </p>

                <div className="bg-white p-2.5 rounded-2xl inline-block shadow-md">
                  <img src={qrCodeUrl} alt="Bitcoin QR Code" className="w-44 h-44 object-contain rounded-lg" />
                </div>

                <div className="bg-[#07090e] border border-[#1b2538] rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <code className="text-[#00e676] font-mono text-xs pl-2 truncate">
                    {BTC_WALLET}
                  </code>
                  <button 
                    type="button"
                    onClick={copyToClipboard}
                    className="bg-[#00e676] hover:bg-[#00c853] text-black font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                  </button>
                </div>
              </div>

              {/* Form Input Fields */}
              {paymentSuccess ? (
                <div className="bg-[#00e676]/10 border border-[#00e676]/30 rounded-xl p-6 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#00e676] mx-auto" />
                  <h3 className="text-base font-bold text-white">Transfer Record Submitted</h3>
                  <p className="text-xs text-[#8e9bae] leading-relaxed max-w-md mx-auto">
                    Your transaction details have been logged into the PR PORTAL system. Our desk will confirm receipt and initiate scheduling.
                  </p>
                  <button 
                    type="button"
                    onClick={() => setPaymentSuccess(false)}
                    className="mt-2 text-xs font-extrabold text-black bg-[#00e676] px-4 py-2 rounded-lg hover:bg-[#00c853] transition-colors"
                  >
                    Submit Another Transfer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmPayment} className="space-y-4">
                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {/* Interactive Client Email Field */}
                  <input 
                    type="email" 
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter client email for official PR PORTAL documentation..."
                    className="w-full bg-[#0e1422] border border-[#1b2538] focus:border-[#00e676] text-white px-4 py-3.5 rounded-xl outline-none text-xs transition-colors placeholder:text-[#475569]"
                  />

                  <textarea 
                    rows={3}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Enter special instructions, itinerary details, or venue preferences (optional)..."
                    className="w-full bg-[#0e1422] border border-[#1b2538] focus:border-[#00e676] text-white p-3.5 rounded-xl outline-none text-xs transition-colors placeholder:text-[#475569] resize-none"
                  />

                  <input 
                    type="text" 
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Enter Bitcoin Transaction Hash / TXID (optional)..."
                    className="w-full bg-[#0e1422] border border-[#1b2538] focus:border-[#00e676] text-white px-4 py-3.5 rounded-xl outline-none text-xs font-mono transition-colors placeholder:text-[#475569]"
                  />

                  {/* Policy Note Box */}
                  <div className="bg-[#0e1422] border border-[#1b2538] rounded-xl p-4">
                    <p className="text-xs text-[#8e9bae] leading-relaxed">
                      <strong className="text-[#00e676]">Policy Note:</strong> All retainer allocations, placement fees, and access bookings are <strong className="text-white">100% Non-Refundable</strong> once access has been officially confirmed and processed.
                    </p>
                  </div>

                  {/* Dynamic Total Agreement Fee Row */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="block text-[11px] text-[#64748b] font-medium uppercase tracking-wider">Total Agreement Fee</span>
                      <span className="text-3xl font-black text-[#00e676] font-mono">
                        ${totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <button 
                      type="submit"
                      disabled={submittingPayment}
                      className="bg-[#00e676] hover:bg-[#00c853] text-black font-extrabold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00e676]/10 disabled:opacity-50 text-xs uppercase tracking-wider"
                    >
                      {submittingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Bitcoin Transfer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>

          </section>

        </div>

      </main>

      {/* Floating WhatsApp Concierge Button */}
      <a 
        href="https://wa.me/YOUR_PHONE_NUMBER_PLACEHOLDER" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#00e676] hover:bg-[#00c853] text-black px-4 py-3 rounded-full font-bold text-xs flex items-center gap-2 shadow-2xl transition-all hover:scale-105 z-50"
      >
        <MessageSquare className="w-4 h-4 fill-black" />
        <span>WhatsApp Concierge</span>
      </a>

    </div>
  );
}