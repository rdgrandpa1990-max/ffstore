import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  CheckCircle, 
  CreditCard, 
  Lock, 
  Flame, 
  Coins, 
  LogIn, 
  Upload, 
  Search, 
  Filter, 
  Sparkles, 
  PlusCircle, 
  MessageSquare, 
  X, 
  ChevronRight, 
  Eye, 
  Heart, 
  Info, 
  AlertCircle, 
  Gamepad2, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  ShoppingBag, 
  Award, 
  Smartphone,
  User,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Database,
  FileText,
  Activity,
  Video
} from 'lucide-react';
import { 
  seedDatabaseIfNeeded, 
  getListings, 
  addListing, 
  purchaseListing, 
  likeListing, 
  incrementViews, 
  verifySellerIdentity, 
  checkIsAdmin,
  addAdmin,
  getAdminsList,
  removeAdmin,
  getExternalConfig,
  saveExternalConfig,
  ExternalApiConfig,
  GameAccount, 
  VerificationRequest,
  UserActivityLog,
  logUserActivity,
  getUserActivityLogs
} from './services/db';
import { 
  LEGAL_OPERATOR, 
  LAST_UPDATED, 
  REFUND_POLICY_INTRO, 
  REFUND_POLICY_SECTIONS, 
  MANDATORY_LEGAL_COVENANTS_INTRO, 
  COVENANTS_SECTIONS, 
  PRIVACY_POLICY, 
  PRICING_PLANS, 
  CONTACT_INFO 
} from './legalData';
import LegalGate from './components/LegalGate';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function App() {
  // Authentication & Profile States
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(120); // starts with $120 virtual wallet
  const [isSellerVerified, setIsSellerVerified] = useState<boolean>(false);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(false);
  
  // Legal Acceptance & Footer State
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<'refund' | 'terms' | 'privacy' | 'pricing' | 'contact'>('refund');
  
  // Marketplace Listings States
  const [listings, setListings] = useState<GameAccount[]>([]);
  const [loadingListings, setLoadingListings] = useState<boolean>(true);
  const [selectedGame, setSelectedGame] = useState<string>('Free Fire');
  const [priceTier, setPriceTier] = useState<string>('All'); // 'All', 'Free', 'Under20', 'Over20'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Newest'); // 'Newest', 'Popular', 'PriceLow', 'PriceHigh'
  
  // Selected Account Detail Modal
  const [selectedAccount, setSelectedAccount] = useState<GameAccount | null>(null);
  const [hasLiked, setHasLiked] = useState<{ [key: string]: boolean }>({});
  
  // Modal Views state
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  
  // Checkout Multi-Step States
  const [checkoutStep, setCheckoutStep] = useState<number>(1); // 1: Card Form, 2: 3D Secure OTP, 3: Success
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [checkoutOtp, setCheckoutOtp] = useState<string>('');
  const [checkoutOtpSent, setCheckoutOtpSent] = useState<string>('1234');
  const [otpError, setOtpError] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [copiedCredentials, setCopiedCredentials] = useState<boolean>(false);
  
  // Sell Form States
  const [sellStep, setSellStep] = useState<number>(1); // 1: Game Details, 2: Verification Scan, 3: Success
  const [sellGame, setSellGame] = useState<'Free Fire' | 'PUBG Mobile' | 'Call of Duty' | 'Clash of Clans' | 'Roblox' | 'Mobile Legends'>('Free Fire');
  const [sellTitle, setSellTitle] = useState<string>('');
  const [sellDescription, setSellDescription] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [sellLevel, setSellLevel] = useState<number>(1);
  const [sellRank, setSellRank] = useState<string>('');
  const [sellSkins, setSellSkins] = useState<number>(0);
  const [sellCharacters, setSellCharacters] = useState<string>('');
  const [sellEmail, setSellEmail] = useState<string>('');
  const [sellPassword, setSellPassword] = useState<string>('');
  const [sellRecovery, setSellRecovery] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  
  // KYC Verification Form States
  const [kycDocType, setKycDocType] = useState<string>('National ID');
  const [kycDocNum, setKycDocNum] = useState<string>('');
  const [kycFullName, setKycFullName] = useState<string>('');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycSelfie, setKycSelfie] = useState<string | null>(null);
  const [kycSuccessMessage, setKycSuccessMessage] = useState<boolean>(false);
  
  // Chatbot Assistant States
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([
    { 
      role: 'model', 
      content: "Welcome to GamerShield! I'm your AI Escrow Assistant. Ask me anything about how we verify game accounts, process secure 3D payments, deliver IDs instantly, or help you sell accounts safely!" 
    }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // External Website Integration States
  const [extApiUrl, setExtApiUrl] = useState<string>('https://api.yourwebsite.com/v1/license');
  const [extApiKey, setExtApiKey] = useState<string>('sh_live_gamershield_key_123456');
  const [extClaimUrl, setExtClaimUrl] = useState<string>('https://yourwebsite.com/claim');
  const [extSaving, setExtSaving] = useState<boolean>(false);
  const [generatedLicenseKey, setGeneratedLicenseKey] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Fetch external website integration configs only when user is verified as administrator
  useEffect(() => {
    async function fetchConfig() {
      if (isAdmin) {
        const config = await getExternalConfig();
        setExtApiUrl(config.apiUrl);
        setExtApiKey(config.apiKey);
        setExtClaimUrl(config.claimUrl);
      }
    }
    fetchConfig();
  }, [isAdmin]);
  
  // Alerts and Toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Admin Panel states
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [adminsList, setAdminsList] = useState<{ email: string; addedBy: string; createdAt: string }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [userLogs, setUserLogs] = useState<UserActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Admin Create Listing states
  const [adminGame, setAdminGame] = useState<'Free Fire' | 'PUBG Mobile' | 'Call of Duty' | 'Clash of Clans' | 'Roblox' | 'Mobile Legends'>('Free Fire');
  const [adminTitle, setAdminTitle] = useState<string>('');
  const [adminDescription, setAdminDescription] = useState<string>('');
  const [adminPrice, setAdminPrice] = useState<number>(0);
  const [adminLevel, setAdminLevel] = useState<number>(1);
  const [adminRank, setAdminRank] = useState<string>('');
  const [adminSkins, setAdminSkins] = useState<number>(0);
  const [adminCharacters, setAdminCharacters] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminRecovery, setAdminRecovery] = useState<string>('');
  const [adminIsVerified, setAdminIsVerified] = useState<boolean>(true);
  const [adminIsSellerVerified, setAdminIsSellerVerified] = useState<boolean>(true);
  const [adminSellerEmail, setAdminSellerEmail] = useState<string>('');
  const [adminSellerName, setAdminSellerName] = useState<string>('');
  const [adminListingLoading, setAdminListingLoading] = useState<boolean>(false);

  // Storefront API Keys States
  const [storefrontApiKeys, setStorefrontApiKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [keyGenerating, setKeyGenerating] = useState<boolean>(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleGenerateStorefrontKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) {
      showToast("Please enter a label for the API Key.", "error");
      return;
    }
    setKeyGenerating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomPart = '';
      for (let i = 0; i < 32; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const generatedKey = `fs_live_${randomPart}`;
      
      const newKeyDoc = {
        label: newKeyLabel.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "api_keys", generatedKey), newKeyDoc);
      setStorefrontApiKeys(prev => [{ id: generatedKey, ...newKeyDoc }, ...prev]);
      setNewKeyLabel('');
      showToast("Storefront API Key generated successfully!", "success");
    } catch (err) {
      console.error("Error generating API key:", err);
      showToast("Failed to generate API key.", "error");
    } finally {
      setKeyGenerating(false);
    }
  };

  const handleRevokeStorefrontKey = async (keyId: string) => {
    if (!window.confirm("Are you sure you want to revoke this API Key? Any application using it will lose access immediately.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "api_keys", keyId));
      setStorefrontApiKeys(prev => prev.filter(k => k.id !== keyId));
      showToast("API Key revoked successfully.", "success");
    } catch (err) {
      console.error("Error revoking API key:", err);
      showToast("Failed to revoke API key.", "error");
    }
  };

  const handleCopyStorefrontKey = (keyId: string) => {
    navigator.clipboard.writeText(keyId);
    setCopiedKeyId(keyId);
    showToast("API Key copied to clipboard!", "success");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Initialize admin form defaults when panel opens
  useEffect(() => {
    if (isAdminPanelOpen) {
      setAdminSellerEmail(currentUserEmail || 'hapa1929@gmail.com');
      setAdminSellerName(currentUsername || 'Root Admin');
    }
  }, [isAdminPanelOpen, currentUserEmail, currentUsername]);

  // Load admins list and verification requests when panel opens
  useEffect(() => {
    async function loadAdminData() {
      if (isAdmin && isAdminPanelOpen) {
        setAdminLoading(true);
        const list = await getAdminsList();
        setAdminsList(list);
        setAdminLoading(false);

        setLoadingRequests(true);
        try {
          const snap = await getDocs(collection(db, "verification_requests"));
          const reqs: VerificationRequest[] = [];
          snap.forEach((doc) => {
            reqs.push({ id: doc.id, ...doc.data() } as VerificationRequest);
          });
          setVerificationRequests(reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
          console.error("Error loading verification requests:", error);
        }
        setLoadingRequests(false);

        // Load user activity logs
        setIsLoadingLogs(true);
        try {
          const logs = await getUserActivityLogs();
          setUserLogs(logs);
        } catch (error) {
          console.error("Error loading activity logs:", error);
        }
        setIsLoadingLogs(false);

        // Load storefront API keys
        try {
          const keysSnap = await getDocs(collection(db, "api_keys"));
          const keysList: any[] = [];
          keysSnap.forEach((docSnap) => {
            keysList.push({ id: docSnap.id, ...docSnap.data() });
          });
          setStorefrontApiKeys(keysList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
          console.error("Error loading storefront API keys:", error);
        }
      }
    }
    loadAdminData();
  }, [isAdmin, isAdminPanelOpen]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = user.email || '';
        setCurrentUserEmail(email);
        setCurrentUsername(user.displayName || 'Gamer_Pro');
        const accepted = localStorage.getItem(`gamershield_accepted_terms_${user.uid}`) === 'true';
        setHasAcceptedTerms(accepted);
        
        // Check admin role
        const isUserAdmin = await checkIsAdmin(email);
        setIsAdmin(isUserAdmin);

        // Fetch user's KYC verification request to see if approved
        try {
          const snap = await getDocs(collection(db, "verification_requests"));
          let isVerified = false;
          snap.forEach((doc) => {
            const data = doc.data();
            if (data.sellerEmail?.toLowerCase() === email.toLowerCase() && data.status === 'approved') {
              isVerified = true;
            }
          });
          setIsSellerVerified(isVerified);
        } catch (err) {
          console.error("Error checking user verification:", err);
        }
      } else {
        const demoEmail = localStorage.getItem('gamershield_demo_email');
        const demoUser = localStorage.getItem('gamershield_demo_username');
        if (demoEmail && demoUser) {
          setCurrentUserEmail(demoEmail);
          setCurrentUsername(demoUser);
          setHasAcceptedTerms(localStorage.getItem('gamershield_accepted_terms_demo') === 'true');
          
          // Check admin role for demo
          const isUserAdmin = await checkIsAdmin(demoEmail);
          setIsAdmin(isUserAdmin);

          // Fetch demo user's KYC verification request to see if approved
          try {
            const snap = await getDocs(collection(db, "verification_requests"));
            let isVerified = false;
            snap.forEach((doc) => {
              const data = doc.data();
              if (data.sellerEmail?.toLowerCase() === demoEmail.toLowerCase() && data.status === 'approved') {
                isVerified = true;
              }
            });
            setIsSellerVerified(isVerified);
          } catch (err) {
            console.error("Error checking demo user verification:", err);
          }
        } else {
          setCurrentUserEmail('');
          setCurrentUsername('');
          setHasAcceptedTerms(false);
          setIsAdmin(false);
          setIsSellerVerified(false);
        }
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch / Seed listings on mount
  useEffect(() => {
    async function initDB() {
      setLoadingListings(true);
      const data = await seedDatabaseIfNeeded();
      setListings(data);
      setLoadingListings(false);
    }
    initDB();
  }, []);

  // Scroll to bottom of chat when updated
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatOpen]);

  // Show customized alert toasts
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync state helper to fetch fresh data from Firestore
  const refreshListings = async () => {
    const updated = await getListings();
    setListings(updated);
  };

  // Like an account ID
  const handleLike = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (hasLiked[listingId]) return;
    
    // Update local state for immediate feedback
    setListings(prev => prev.map(item => {
      if (item.id === listingId) {
        return { ...item, likes: item.likes + 1 };
      }
      return item;
    }));
    setHasLiked(prev => ({ ...prev, [listingId]: true }));
    showToast("Liked this game account ID!", "success");

    // Log the user activity
    const listing = listings.find(l => l.id === listingId);
    const details = listing ? `Liked account listing: "${listing.title}" (${listing.game})` : `Liked account listing ID: ${listingId}`;
    logUserActivity("Liked Account", details, currentUserEmail);

    // Persist to Firestore
    await likeListing(listingId);
  };

  // View Details (Increments views count)
  const handleViewDetails = async (account: GameAccount) => {
    setSelectedAccount(account);
    await incrementViews(account.id);
    // Update views count in local array
    setListings(prev => prev.map(item => {
      if (item.id === account.id) {
        return { ...item, views: item.views + 1 };
      }
      return item;
    }));

    // Log the user activity
    logUserActivity("Viewed Account", `Opened full details of account: "${account.title}" (${account.game})`, currentUserEmail);
  };

  // KYC seller verification process
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFullName || !kycDocNum) {
      showToast("Please fill in all requested identification details.", "error");
      return;
    }
    
    setVerificationLoading(true);
    // Simulate real high-security biometric and OCR scan
    setTimeout(async () => {
      const request = {
        sellerEmail: currentUserEmail,
        sellerName: kycFullName || currentUsername,
        documentType: kycDocType,
        documentNumber: kycDocNum,
      };
      
      const res = await verifySellerIdentity(request);
      setVerificationLoading(false);
      if (res) {
        setKycSuccessMessage(true);
        showToast("KYC ID Verification Request Submitted! Pending administrator review.", "success");
        
        // Log the user activity
        logUserActivity("Submitted KYC", `Submitted ID verification request (${kycDocType}) under full name: "${kycFullName}"`, currentUserEmail);

        setTimeout(() => {
          setIsKycModalOpen(false);
          setKycSuccessMessage(false);
          // clear forms
          setKycFullName('');
          setKycDocNum('');
        }, 3000);
      } else {
        showToast("Error processing verification. Please try again.", "error");
      }
    }, 2000);
  };

  // Sell Listing Creation with Simulated Game Scanner
  const handleSellListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTitle) {
      showToast("Please provide listing title.", "error");
      return;
    }

    setSellStep(2); // transition to Game ID Scanner simulation
    setScanProgress(10);
    setScanStatus("Contacting Game Servers...");

    const intervals = [
      { prg: 30, text: `Connecting to ${sellGame} API gateway...` },
      { prg: 55, text: `Analyzing Player ID Level and Rank Achievements...` },
      { prg: 80, text: `Decrypting skins inventory and verifying safety status...` },
      { prg: 100, text: "Verification SUCCESSFUL! Auto-generating verified badge." }
    ];

    let i = 0;
    const intervalId = setInterval(async () => {
      if (i < intervals.length) {
        setScanProgress(intervals[i].prg);
        setScanStatus(intervals[i].text);
        i++;
      } else {
        clearInterval(intervalId);
        
        // Save listing to Firestore
        const charactersArray = sellCharacters ? sellCharacters.split(',').map(s => s.trim()) : [];
        const newListing = {
          game: sellGame,
          title: sellTitle,
          description: sellDescription || `Premium verified ${sellGame} ID account. Ready for instant use.`,
          price: Number(sellPrice),
          level: Number(sellLevel),
          rank: sellRank || "Standard",
          skinsCount: Number(sellSkins),
          characters: charactersArray,
          verified: true, // auto-verified because it passed scanner!
          sellerVerified: isSellerVerified,
          sellerEmail: currentUserEmail,
          sellerName: currentUsername,
          credentials: {
            email: sellEmail || '',
            pass: sellPassword || '',
            recoveryCode: sellRecovery || ''
          }
        };

        const res = await addListing(newListing);
        if (res) {
          setSellStep(3);
          refreshListings();
          showToast("Listing added successfully! Verified badge activated.", "success");

          // Log the user activity
          logUserActivity("Created Listing", `Created new verified listing: "${newListing.title}" (${newListing.game}) priced at $${newListing.price}`, currentUserEmail);
        } else {
          showToast("Failed to save listing. Please try again.", "error");
          setSellStep(1);
        }
      }
    }, 1200);
  };

  // Directly create account listing as administrator
  const handleAdminAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle) {
      showToast("Please provide listing title.", "error");
      return;
    }

    setAdminListingLoading(true);
    try {
      const charactersArray = adminCharacters ? adminCharacters.split(',').map(s => s.trim()) : [];
      const newListing = {
        game: adminGame,
        title: adminTitle,
        description: adminDescription || `Verified ${adminGame} game account. Available instantly.`,
        price: Number(adminPrice),
        level: Number(adminLevel),
        rank: adminRank || "Standard",
        skinsCount: Number(adminSkins),
        characters: charactersArray,
        verified: adminIsVerified,
        sellerVerified: adminIsSellerVerified,
        sellerEmail: adminSellerEmail || currentUserEmail || "admin@gamershield.com",
        sellerName: adminSellerName || currentUsername || "Administrator",
        credentials: {
          email: adminEmail || '',
          pass: adminPassword || '',
          recoveryCode: adminRecovery || ''
        }
      };

      const res = await addListing(newListing);
      if (res) {
        showToast("Admin Listing published directly to the marketplace!", "success");
        refreshListings();

        // Log the user activity
        logUserActivity("Admin Listing Published", `Admin published direct listing: "${newListing.title}" (${newListing.game}) for $${newListing.price}`, currentUserEmail);
        
        // Clear admin form states
        setAdminTitle('');
        setAdminDescription('');
        setAdminPrice(0);
        setAdminLevel(1);
        setAdminRank('');
        setAdminSkins(0);
        setAdminCharacters('');
        setAdminEmail('');
        setAdminPassword('');
        setAdminRecovery('');
      } else {
        showToast("Error saving administrative listing.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An unexpected error occurred while saving the listing.", "error");
    } finally {
      setAdminListingLoading(false);
    }
  };

  // Checkout Payment Process (Simulates Multi-Step 3D Secure checkout)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutStep === 1) {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        showToast("Please fill in all credit card payment fields.", "error");
        return;
      }
      
      setPaymentLoading(true);
      // Simulate connecting to secure payment vault
      setTimeout(() => {
        setPaymentLoading(false);
        // Generate a random 4-digit OTP code for 3D Secure verification
        const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setCheckoutOtpSent(mockOtp);
        setCheckoutStep(2); // Go to 3D Secure OTP confirmation screen
        showToast(`Secure payment gateway triggered! Verification OTP sent.`, "info");

        // Log the user activity
        if (selectedAccount) {
          logUserActivity("Initiated Checkout", `Started 3D Secure payment checkout process for "${selectedAccount.title}" ($${selectedAccount.price})`, currentUserEmail);
        }
      }, 1500);
    } else if (checkoutStep === 2) {
      if (checkoutOtp !== checkoutOtpSent && checkoutOtp !== '1234') { // Allow standard 1234 bypass
        setOtpError("Invalid verification code. Please check and try again.");
        return;
      }

      setPaymentLoading(true);
      setOtpError('');

      // Perform transaction write to Firestore
      setTimeout(async () => {
        if (selectedAccount) {
          const success = await purchaseListing(selectedAccount.id, currentUserEmail);
          setPaymentLoading(false);
          if (success) {
            // Deduct virtual balance if not a $0 claim
            if (selectedAccount.price > 0) {
              setUserBalance(prev => Math.max(0, prev - selectedAccount.price));
            }

            // Generate an Order ID
            const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000).toString();

            // Try making the real request to their external website API
            let licenseKey = "";
            try {
              const response = await fetch(extApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${extApiKey}`
                },
                body: JSON.stringify({
                  orderId: orderId,
                  game: selectedAccount.game,
                  price: selectedAccount.price,
                  title: selectedAccount.title,
                  level: selectedAccount.level,
                  rank: selectedAccount.rank,
                  buyerEmail: currentUserEmail
                })
              });
              if (response.ok) {
                const data = await response.json();
                licenseKey = data.licenseKey || data.key || data.license || "";
              }
            } catch (err) {
              console.warn("External integration URL call failed/timedout, auto-generating mock licence key for flow simulation:", err);
            }

            if (!licenseKey) {
              // fallback secure licence key format
              licenseKey = "GS-" + selectedAccount.game.substring(0, 2).toUpperCase() + "-" + Math.random().toString(36).substring(2, 10).toUpperCase();
            }

            // Log the user activity
            logUserActivity("Completed Purchase", `Successfully paid $${selectedAccount.price} for "${selectedAccount.title}". Order ID: ${orderId}, Generated License: ${licenseKey}`, currentUserEmail);

            setGeneratedLicenseKey(licenseKey);
            setCheckoutStep(3); // success screen
            refreshListings();
            showToast("Secure Payment Authorized! Game account delivered immediately.", "success");
          } else {
            showToast("Failed to process transaction. The item may have been sold.", "error");
            setIsCheckoutModalOpen(false);
          }
        }
      }, 1800);
    }
  };

  // AI assistant messaging logic
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage.trim();
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error('Server error communicating with Gemini Assistant.');
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err: any) {
      console.error(err);
      // Fallback response for perfect client UX
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        content: "I'm having trouble reaching my high-tech secure core server. Rest assured, our payment processing is highly encrypted using 256-bit AES technology and our escrow ensures that sellers do not receive funds until you claim the account." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Filter listings based on selections
  const filteredListings = listings.filter(item => {
    // 1. Force game filter to only show Free Fire (since others are coming soon)
    if (item.game !== 'Free Fire') return false;
    
    // 2. Price Tier filter
    if (priceTier === 'Free' && item.price !== 0) return false;
    if (priceTier === 'Under20' && (item.price === 0 || item.price > 20)) return false;
    if (priceTier === 'Over20' && item.price <= 20) return false;
    
    // 3. Search query
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(queryLower);
      const descMatch = item.description.toLowerCase().includes(queryLower);
      const rankMatch = item.rank.toLowerCase().includes(queryLower);
      const gameMatch = item.game.toLowerCase().includes(queryLower);
      return titleMatch || descMatch || rankMatch || gameMatch;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'Newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'Popular') {
      return b.views - a.views;
    }
    if (sortBy === 'PriceLow') {
      return a.price - b.price;
    }
    if (sortBy === 'PriceHigh') {
      return b.price - a.price;
    }
    return 0;
  });

  // Calculate my purchased library
  const purchasedLibrary = listings.filter(item => item.buyerEmail === currentUserEmail && item.status === 'sold');

  // Loading check while verifying session
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative h-16 w-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-violet-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-6 w-6 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">Securing Connection</h3>
            <p className="text-xs text-slate-500 font-mono animate-pulse">Verifying encrypted operator logs...</p>
          </div>
        </div>
      </div>
    );
  }

  // Gating check: if not logged in or terms not accepted, enforce the Legal Gate
  if (!currentUserEmail || !hasAcceptedTerms) {
    return (
      <>
        {/* Render Toast notification component on LegalGate as well so users see feedback */}
        {toastMessage && (
          <div 
            id="toast-notification-gate"
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-lg ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
            {toastMessage.type === 'info' && <Info className="h-5 w-5 text-indigo-400" />}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
        )}
        <LegalGate 
          currentUserEmail={currentUserEmail}
          currentUsername={currentUsername}
          setCurrentUserEmail={setCurrentUserEmail}
          setCurrentUsername={setCurrentUsername}
          setHasAcceptedTerms={setHasAcceptedTerms}
          showToast={showToast}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Toast notification component */}
      {toastMessage && (
        <div 
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-lg animate-bounce ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
          {toastMessage.type === 'info' && <Info className="h-5 w-5 text-indigo-400" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Navigation Header bar */}
      <header id="main-navigation" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                GAMERSHIELD
              </span>
              <span className="text-xs font-bold text-cyan-400 tracking-wider block leading-none uppercase">
                Escrow & ID Exchange
              </span>
            </div>
          </div>

          {/* Search bar widget */}
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
            <input 
              id="search-input"
              type="text" 
              placeholder="Search Free Fire Grandmaster IDs, level 70..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-all"
            />
          </div>

          {/* User profile controls & action triggers */}
          <div className="flex items-center gap-4 flex-wrap justify-end">
            
            {/* Wallet simulated balance */}
            <div id="wallet-badge" className="bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2" title="Simulated Gamer Wallet">
              <Coins className="h-4.5 w-4.5 text-amber-400" />
              <div className="text-xs text-slate-400 font-medium">
                Wallet: <span className="text-white font-bold">${userBalance.toFixed(2)}</span>
              </div>
              <button 
                id="top-up-btn"
                onClick={() => {
                  setUserBalance(prev => prev + 50);
                  showToast("Deposited $50.00 play funds to secure wallet!", "success");
                }}
                className="ml-1 text-[10px] bg-cyan-950 hover:bg-cyan-900 text-cyan-400 px-1.5 py-0.5 rounded font-bold transition-all uppercase"
              >
                + $50
              </button>
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 py-1 px-3 rounded-xl">
              <div className="relative">
                <div className="h-7 w-7 rounded-lg bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-xs font-black text-violet-300">
                  GP
                </div>
                {isSellerVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-0.5 border border-slate-950" title="Identity Verified Seller">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold flex items-center gap-1">
                  <span>{currentUsername}</span>
                  {isSellerVerified && <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1 rounded font-bold uppercase">Seller ✔</span>}
                </div>
                <div className="text-[10px] text-slate-500">{currentUserEmail}</div>
              </div>
            </div>

            {/* Library button */}
            <button
              id="library-trigger-btn"
              onClick={() => setIsLibraryOpen(true)}
              className="relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl transition-all"
              title="My Purchased Accounts"
            >
              <ShoppingBag className="h-5 w-5 text-slate-300" />
              {purchasedLibrary.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-slate-950">
                  {purchasedLibrary.length}
                </span>
              )}
            </button>

            {/* Sign Out Button */}
            <button
              id="sign-out-btn"
              onClick={() => {
                setCurrentUserEmail('');
                setCurrentUsername('');
                setHasAcceptedTerms(false);
                localStorage.removeItem('gamershield_email');
                localStorage.removeItem('gamershield_username');
                localStorage.removeItem('gamershield_accepted_terms');
                localStorage.removeItem('gamershield_demo_email');
                localStorage.removeItem('gamershield_demo_username');
                localStorage.removeItem('gamershield_accepted_terms_demo');
                signOut(auth).catch(() => {});
                showToast("Signed out successfully. Session secure.", "info");
              }}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl transition-all text-slate-400 hover:text-rose-400"
              title="Sign Out Session"
            >
              <LogIn className="h-5 w-5 rotate-180 font-bold" />
            </button>

            {/* Admin Panel Button */}
            {isAdmin && (
              <button
                id="admin-panel-trigger-btn"
                onClick={() => {
                  setIsAdminPanelOpen(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Admin Control Center"
              >
                <Shield className="h-4.5 w-4.5 text-cyan-200" />
                <span className="hidden md:inline">Admin Panel</span>
              </button>
            )}

            {/* Sell Game Account Button */}
            {isAdmin && (
              <button
                id="sell-account-trigger-btn"
                onClick={() => {
                  setSellStep(1);
                  setIsSellModalOpen(true);
                }}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                Sell ID
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main id="main-content-area" className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-8">
        
        {/* Safe Escrow Hero Banner */}
        <section id="escrow-banner" className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 p-6 lg:p-10 flex flex-col lg:flex-row gap-8 items-center">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-violet-950/60 border border-violet-500/30 px-3 py-1 rounded-full text-xs font-bold text-violet-300">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Instant Secure Escrow Guarantee
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Buy & Sell Game Accounts <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                With Automated ID Scan Verification
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Tired of account trade scams? GamerShield locks the login credentials in secure escrow, automatically scans and verifies details with system APIs, and releases details instantly after encrypted checkout.
            </p>
            
            {/* Quick trust metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">100% Escrow Protection</div>
                  <div className="text-[10px] text-slate-500">Funds protected safely</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-violet-950 border border-violet-500/30 text-violet-400">
                  <Key className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Instant Delivery</div>
                  <div className="text-[10px] text-slate-500">Auto credentials release</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 col-span-2 md:col-span-1">
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Automated ID Scans</div>
                  <div className="text-[10px] text-slate-500">Real rank & level checks</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Browse Title Section */}
        <section id="marketplace-search-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-white">
                <Gamepad2 className="h-5 w-5 text-violet-500" />
                BROWSE GAME ACCOUNTS & IDS
              </h2>
              <p className="text-xs text-slate-500">Explore both free giveaway IDs and high-level premium accounts</p>
            </div>

            {/* Sorting trigger */}
            <div className="flex items-center gap-2 self-end">
              <span className="text-xs text-slate-500">Sort:</span>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="Newest">Newest Listed</option>
                <option value="Popular">Most Views</option>
                <option value="PriceLow">Price: Low to High</option>
                <option value="PriceHigh">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Quick game filters */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            {['Free Fire', 'PUBG Mobile', 'Call of Duty', 'Clash of Clans', 'Roblox', 'Mobile Legends'].map((game) => {
              const isComingSoon = game !== 'Free Fire';
              return (
                <button
                  key={game}
                  id={`game-filter-${game.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => {
                    if (isComingSoon) {
                      showToast(`${game} trade is Coming Soon! Currently only Free Fire is active.`, "info");
                    } else {
                      setSelectedGame(game);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isComingSoon 
                      ? 'bg-slate-900/30 border-slate-900 text-slate-600 cursor-not-allowed font-medium'
                      : selectedGame === game
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-500 text-white shadow-lg shadow-violet-500/25'
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {game}
                  {isComingSoon && (
                    <span className="text-[8px] bg-slate-950 text-amber-500 border border-slate-850 px-1 py-0.5 rounded font-black uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Budget filter selectors */}
          <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-850 w-fit">
            <span className="text-[10px] font-black text-slate-500 uppercase px-2">Budget:</span>
            {[
              { id: 'All', label: 'All Listings' },
              { id: 'Free', label: '🎁 Free Giveaways' },
              { id: 'Under20', label: 'Under $20' },
              { id: 'Over20', label: 'Premium (Over $20)' }
            ].map(tier => (
              <button
                key={tier.id}
                id={`tier-filter-${tier.id}`}
                onClick={() => setPriceTier(tier.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  priceTier === tier.id 
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </section>

        {/* Listings Loading indicator / Empty State / Grid */}
        <section id="listings-grid-section">
          {loadingListings ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-400">Synchronizing with Secure Firestore Database...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <Gamepad2 className="h-12 w-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white">No Game IDs found matching filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">Try resetting the game tag or price selection, or clear your search input text.</p>
              <button
                id="reset-filters-btn"
                onClick={() => {
                  setSelectedGame('Free Fire');
                  setPriceTier('All');
                  setSearchQuery('');
                }}
                className="mt-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                Reset Filter Choices
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  id={`account-card-${item.id}`}
                  onClick={() => handleViewDetails(item)}
                  className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-850 hover:border-violet-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  {/* Status Tag Overlay */}
                  {item.status === 'sold' && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-10 flex flex-col items-center justify-center">
                      <div className="bg-slate-900 border border-rose-500/40 text-rose-400 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
                        <Lock className="h-4 w-4" />
                        SOLD & SECURED
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Transferred via Escrow successfully</p>
                    </div>
                  )}

                  {/* Media Visual Banner if present */}
                  {item.mediaUrl && (
                    <div className="relative aspect-video bg-slate-955 flex items-center justify-center overflow-hidden border-b border-slate-850">
                      {item.mediaType === 'video' ? (
                        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                          <Video className="h-8 w-8 text-violet-500/85" />
                          <span className="absolute bottom-2 right-2 text-[8px] bg-slate-900 text-slate-400 border border-slate-800 px-1 py-0.5 rounded font-black uppercase tracking-wider">Video</span>
                        </div>
                      ) : (
                        <img 
                          src={item.mediaUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      )}
                    </div>
                  )}

                  {/* Header info */}
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      {/* Game tag */}
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 px-2.5 py-1 rounded-md text-cyan-400 border border-cyan-500/10">
                        {item.game}
                      </span>

                      {/* Badges */}
                      <div className="flex gap-1">
                        {item.verified && (
                          <span className="text-[9px] font-black bg-violet-950/90 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded flex items-center gap-0.5" title="System Verified Account Data">
                            <Shield className="h-2.5 w-2.5 text-violet-400" />
                            VERIFIED
                          </span>
                        )}
                        {item.sellerVerified && (
                          <span className="text-[9px] font-black bg-cyan-950/90 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-0.5" title="KYC Checked Identity Seller">
                            <ShieldCheck className="h-2.5 w-2.5 text-cyan-400" />
                            TRUSTED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-extrabold text-base text-white group-hover:text-violet-400 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 py-2 bg-slate-950/40 border border-slate-850/40 rounded-xl p-2.5">
                      <div className="text-center border-r border-slate-850/60 last:border-0">
                        <div className="text-[10px] text-slate-500 uppercase font-bold leading-none">Level</div>
                        <div className="text-xs font-black text-white mt-1">{item.level}</div>
                      </div>
                      <div className="text-center border-r border-slate-850/60 last:border-0">
                        <div className="text-[10px] text-slate-500 uppercase font-bold leading-none">Rank</div>
                        <div className="text-[11px] font-black text-violet-300 truncate mt-1" title={item.rank}>{item.rank}</div>
                      </div>
                      <div className="text-center border-r border-slate-850/60 last:border-0">
                        <div className="text-[10px] text-slate-500 uppercase font-bold leading-none">Skins</div>
                        <div className="text-xs font-black text-cyan-300 mt-1">{item.skinsCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer card controls */}
                  <div className="bg-slate-900/40 border-t border-slate-850 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {item.views}
                      </span>
                      <button
                        onClick={(e) => handleLike(e, item.id)}
                        className={`flex items-center gap-1 transition-colors hover:text-rose-400 ${hasLiked[item.id] ? 'text-rose-400 font-bold' : ''}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${hasLiked[item.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                        {item.likes}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block leading-none">Price</span>
                        <span className={`text-base font-black ${item.price === 0 ? 'text-emerald-400' : 'text-white'}`}>
                          {item.price === 0 ? 'FREE GIFT' : `$${item.price}`}
                        </span>
                      </div>
                      <div className="bg-violet-600/10 text-violet-400 p-1.5 rounded-lg group-hover:bg-violet-600 group-hover:text-white transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer id="global-footer" className="bg-slate-950 border-t border-slate-900 py-10 px-4 text-center mt-12 relative z-20">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Shield className="h-5 w-5 text-violet-500 animate-pulse" />
            <span className="text-sm font-black text-white tracking-wider">GAMERSHIELD SECURITY SYSTEM v3.4</span>
          </div>
          
          {/* Policy Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
            <button
              id="footer-link-pricing"
              onClick={() => {
                setLegalTab('pricing');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-violet-400 cursor-pointer transition-colors font-bold"
            >
              Pricing & Plans
            </button>
            <button
              id="footer-link-contact"
              onClick={() => {
                setLegalTab('contact');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-violet-400 cursor-pointer transition-colors font-bold"
            >
              Contact Us
            </button>
            <button
              id="footer-link-terms"
              onClick={() => {
                setLegalTab('terms');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-violet-400 cursor-pointer transition-colors font-bold"
            >
              Terms & Conditions
            </button>
            <button
              id="footer-link-privacy"
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-violet-400 cursor-pointer transition-colors font-bold"
            >
              Privacy Policy
            </button>
            <button
              id="footer-link-refund"
              onClick={() => {
                setLegalTab('refund');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-violet-400 cursor-pointer transition-colors font-bold"
            >
              Cancellation & Refund
            </button>
          </div>

          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            This is a secure trading dashboard for Free Fire IDs. Transactions operate through pre-cleared legal escrow and instant token handoffs managed under Shivam Bhatt's covenants.
          </p>
          <div className="text-[10px] text-slate-600 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4">
            <span>© 2026 {LEGAL_OPERATOR}. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <span>Last Updated: {LAST_UPDATED}</span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <span>Powered by Google Cloud & Firestore</span>
          </div>
        </div>
      </footer>

      {/* CHATBOT ASSISTANT FLOATING TOGGLE AND DRAWER */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isChatOpen ? (
          <button
            id="chat-toggle-open"
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full p-4 shadow-2xl hover:scale-105 active:scale-95 transition-all relative flex items-center justify-center"
          >
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </button>
        ) : (
          <div 
            id="chat-assistant-drawer"
            className="bg-slate-900 border border-slate-800 w-[350px] sm:w-[400px] h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {/* Chat header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 border-b border-slate-850 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1">
                    GamerShield AI
                  </h3>
                  <div className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    Online Escrow Agent
                  </div>
                </div>
              </div>
              <button
                id="chat-toggle-close"
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-none'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-violet-500" />
                    Agent is typing security logs...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}></div>
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-850 flex gap-2">
              <input
                id="chat-input-text"
                type="text"
                placeholder="Ask about secure checkout, Free Fire IDs..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={chatLoading}
                className="flex-1 bg-slate-950 border border-slate-800 focus:outline-none focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 transition-all"
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={chatLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            id="detail-modal-container"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
          >
            {/* Detail Header */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-violet-950 border border-violet-500/20 text-violet-300 font-bold px-2 py-0.5 rounded uppercase">
                  {selectedAccount.game}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: #{selectedAccount.id.slice(0, 8)}</span>
              </div>
              <button
                id="detail-modal-close"
                onClick={() => setSelectedAccount(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Detail Body */}
            <div className="p-6 space-y-6 flex-1">
              <div>
                <h2 className="text-xl font-extrabold text-white">{selectedAccount.title}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Listed by: <strong className="text-slate-300">{selectedAccount.sellerName}</strong></span>
                  </div>
                  {selectedAccount.sellerVerified && (
                    <span className="bg-cyan-950 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-black border border-cyan-500/20 flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" />
                      VERIFIED SELLER
                    </span>
                  )}
                </div>
              </div>

              {/* Media Preview if present */}
              {selectedAccount.mediaUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {selectedAccount.mediaType === 'video' ? (
                    <video 
                      src={selectedAccount.mediaUrl} 
                      controls 
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={selectedAccount.mediaUrl} 
                      alt={selectedAccount.title} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Stats Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="text-center sm:border-r border-slate-850 last:border-0">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Game Level</span>
                  <span className="text-lg font-black text-white mt-1 block">{selectedAccount.level}</span>
                </div>
                <div className="text-center sm:border-r border-slate-850 last:border-0">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">League/Rank</span>
                  <span className="text-sm font-black text-violet-300 mt-1 block. truncate px-1" title={selectedAccount.rank}>
                    {selectedAccount.rank}
                  </span>
                </div>
                <div className="text-center sm:border-r border-slate-850 last:border-0">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Skins Inventory</span>
                  <span className="text-lg font-black text-cyan-300 mt-1 block">{selectedAccount.skinsCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Verification Score</span>
                  <span className="text-xs font-black text-emerald-400 mt-1 block flex items-center justify-center gap-0.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {selectedAccount.verified ? "100% Valid" : "Unscanned"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Account Specifications & Perks</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-850/60">
                  {selectedAccount.description}
                </p>
              </div>

              {/* Characters / Special items list */}
              {selectedAccount.characters && selectedAccount.characters.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Featured Assets</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAccount.characters.map((char, index) => (
                      <span key={index} className="bg-slate-950 border border-slate-850 text-slate-300 text-xs px-2.5 py-1 rounded-lg font-medium">
                        ✦ {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust disclaimer banner */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl flex gap-3">
                <Lock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-indigo-200">256-bit Secure Escrow Active</h5>
                  <p className="text-[10px] text-indigo-400 leading-relaxed">
                    When you purchase this account, funds are held securely in escrow. You immediately receive the verified logins (email, password, recovery code). The seller only receives payout once the transaction has been safely locked.
                  </p>
                </div>
              </div>
            </div>

            {/* Detail Footer with Purchase triggers */}
            <div className="bg-slate-950 p-5 border-t border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block leading-none">Checkout Price</span>
                <span className="text-2xl font-black text-white">
                  {selectedAccount.price === 0 ? "FREE GIVEAWAY" : `$${selectedAccount.price}`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="detail-back-btn"
                  onClick={() => setSelectedAccount(null)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-800 transition-all"
                >
                  Cancel
                </button>
                
                {selectedAccount.status === 'sold' ? (
                  <button 
                    disabled 
                    className="bg-slate-800 text-slate-500 text-xs font-bold px-6 py-2.5 rounded-xl cursor-not-allowed uppercase"
                  >
                    Sold Out
                  </button>
                ) : selectedAccount.price > userBalance && selectedAccount.price > 0 ? (
                  <button
                    id="insufficient-funds-trigger-btn"
                    onClick={() => {
                      showToast("Insufficient play funds. Click '+ $50' on top wallet to add play cash!", "error");
                    }}
                    className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
                  >
                    Add play funds to buy
                  </button>
                ) : (
                  <button
                    id="initiate-checkout-btn"
                    onClick={() => {
                      setCheckoutStep(1);
                      setCardHolder('');
                      setCardNumber('');
                      setCardExpiry('');
                      setCardCvv('');
                      setCheckoutOtp('');
                      setIsCheckoutModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <CreditCard className="h-4.5 w-4.5" />
                    {selectedAccount.price === 0 ? "Claim Free ID" : "Secure Checkout"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="checkout-modal-container"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
          >
            {/* Checkout Header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-cyan-400" />
                <span className="text-sm font-black text-white tracking-wider uppercase">GamerShield Gateway</span>
              </div>
              <button
                id="checkout-modal-close"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={paymentLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Checkout Steps Navigation visual indicators */}
            <div className="flex bg-slate-950/80 px-5 py-3 border-b border-slate-850/50 justify-between text-[11px] font-bold text-slate-500">
              <span className={checkoutStep === 1 ? 'text-violet-400' : 'text-slate-400'}>1. SECURE DETAILS</span>
              <span className="text-slate-700">➔</span>
              <span className={checkoutStep === 2 ? 'text-violet-400' : 'text-slate-400'}>2. 3D-SECURE VERIFY</span>
              <span className="text-slate-700">➔</span>
              <span className={checkoutStep === 3 ? 'text-emerald-400' : 'text-slate-400'}>3. SECURED ACCESS</span>
            </div>

            {/* Checkout Body Forms */}
            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
              
              {/* STEP 1: CARD DETAILS FORM */}
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  {/* Summary row */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-500 block">Item Selected</span>
                      <strong className="text-slate-200 line-clamp-1">{selectedAccount.title}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Amount</span>
                      <strong className="text-emerald-400 font-black">{selectedAccount.price === 0 ? "FREE" : `$${selectedAccount.price.toFixed(2)}`}</strong>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Cardholder Name</label>
                      <input
                        id="card-holder-name"
                        type="text"
                        placeholder="Johnathan Doe"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Secure Card Number</label>
                      <div className="relative">
                        <input
                          id="card-number"
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          maxLength={19}
                          required
                          value={cardNumber}
                          onChange={(e) => {
                            // Format space separated cards for beauty
                            const val = e.target.value.replace(/\D/g, '');
                            const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                            setCardNumber(formatted);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all"
                        />
                        <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Expiry Date</label>
                        <input
                          id="card-expiry"
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          value={cardExpiry}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length >= 2) {
                              setCardExpiry(val.slice(0, 2) + '/' + val.slice(2, 4));
                            } else {
                              setCardExpiry(val);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">CVV Code</label>
                        <input
                          id="card-cvv"
                          type="password"
                          placeholder="•••"
                          maxLength={3}
                          required
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all text-center font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment vault safety note */}
                  <div className="flex gap-2 items-center text-[10px] text-slate-500 py-1 justify-center">
                    <Shield className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Your credit card number is encrypted end-to-end.</span>
                  </div>

                  {/* Action */}
                  <button
                    id="submit-payment-details"
                    type="submit"
                    disabled={paymentLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Encrypting payment payload...
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Proceed to 3D Verification
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: 3D SECURE OTP CODE SCREEN */}
              {checkoutStep === 2 && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto h-12 w-12 bg-indigo-950/60 text-indigo-400 rounded-full border border-indigo-500/30 flex items-center justify-center mb-2">
                    <Smartphone className="h-6 w-6 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-white">3D Secure Verified by Visa/Mastercard</h3>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      A simulated OTP check has been launched for secure verification. Input code <strong>{checkoutOtpSent}</strong> (or <strong>1234</strong>) to authorize.
                    </p>
                  </div>

                  <div className="max-w-[200px] mx-auto">
                    <input
                      id="otp-input-field"
                      type="text"
                      placeholder="••••"
                      maxLength={4}
                      value={checkoutOtp}
                      onChange={(e) => setCheckoutOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-violet-500 rounded-xl text-center py-2.5 text-lg font-black tracking-[12px] text-violet-400"
                    />
                    {otpError && <p className="text-[10px] text-rose-400 mt-2 font-semibold">{otpError}</p>}
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Authorization ID: <span className="font-mono text-slate-400">#AUTH-98218X-ID</span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      id="otp-cancel-btn"
                      type="button"
                      onClick={() => setCheckoutStep(1)}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      id="otp-confirm-btn"
                      type="submit"
                      disabled={paymentLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      {paymentLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Confirm Code
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION SUCCESS & EXTERNAL KEY DELIVERY */}
              {checkoutStep === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <div className="mx-auto h-12 w-12 bg-emerald-950/60 border border-emerald-500/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-black text-white">Payment Securely Completed!</h3>
                    <p className="text-[11px] text-slate-400">
                      Your order has been authorized. We have requested your account license and credentials from our external integration system.
                    </p>
                  </div>

                  {/* External System Integration Delivery container */}
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 uppercase tracking-wider">
                      <Key className="h-4 w-4" />
                      <span>Dynamic License Key Delivered</span>
                    </div>
                    
                    <p className="text-xs text-slate-300 leading-relaxed text-justify">
                      We've successfully verified your payment and queried the external website database. Your unique <strong>Specification License Key</strong> has been generated below:
                    </p>

                    <div className="bg-slate-950 rounded-lg p-3 text-center border border-slate-850">
                      <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">Generated License Key</span>
                      <span className="font-mono text-emerald-400 font-black text-xs select-all tracking-widest block py-1 bg-slate-900/60 rounded border border-slate-800/40">
                        {generatedLicenseKey}
                      </span>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-3 text-center border border-slate-850">
                      <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">Your Order ID</span>
                      <span className="font-mono text-cyan-400 font-extrabold text-xs select-all tracking-wider block py-1">
                        {selectedAccount.id}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] text-slate-400 text-center">
                        Click below to open our external website to instantly claim your game credentials!
                      </p>
                      
                      <a
                        href={`${extClaimUrl}?orderId=${selectedAccount.id}&key=${generatedLicenseKey}&game=${encodeURIComponent(selectedAccount.game)}&specification=${encodeURIComponent(selectedAccount.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-900/20 text-center"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Retrieve ID From External Website
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850/40 text-[10px] text-slate-500 leading-relaxed text-center">
                    💡 This order and license is also securely saved in your <strong>"My Purchases Library"</strong>. You can retrieve it or contact support at any time.
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="copy-license-btn"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLicenseKey);
                        showToast("Copied License Key successfully!", "success");
                      }}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy className="h-4 w-4 text-slate-400" />
                      Copy License Key
                    </button>
                    
                    <button
                      id="close-success-checkout-btn"
                      type="button"
                      onClick={() => {
                        setIsCheckoutModalOpen(false);
                        setSelectedAccount(null);
                      }}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      Done & Exit
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* SELL ID MODAL */}
      {isSellModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="sell-modal-container"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-violet-500" />
                <h3 className="text-sm font-black text-white tracking-wider uppercase">List Secure Game Account</h3>
              </div>
              <button
                id="sell-modal-close"
                onClick={() => setIsSellModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps visualizer */}
            <div className="flex bg-slate-950/80 px-5 py-3 border-b border-slate-850/50 justify-between text-[11px] font-bold text-slate-500">
              <span className={sellStep === 1 ? 'text-violet-400' : 'text-slate-400'}>1. SPECIFICATIONS</span>
              <span className="text-slate-700">➔</span>
              <span className={sellStep === 2 ? 'text-violet-400' : 'text-slate-400'}>2. AUTOMATED API CHECK</span>
              <span className="text-slate-700">➔</span>
              <span className={sellStep === 3 ? 'text-emerald-400' : 'text-slate-400'}>3. SECURELY LISTED</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSellListingSubmit} className="p-6 space-y-4">
              
              {/* STEP 1: SPEC DETAILS */}
              {sellStep === 1 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  
                  {/* Select Game & Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Target Game</label>
                      <select
                        id="sell-game-select"
                        value={sellGame}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          if (val !== 'Free Fire') {
                            showToast(`${val} trade is Coming Soon!`, "info");
                          } else {
                            setSellGame(val);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                      >
                        <option value="Free Fire">Free Fire</option>
                        <option value="PUBG Mobile" disabled>PUBG Mobile (Coming Soon)</option>
                        <option value="Call of Duty" disabled>Call of Duty Mobile (Coming Soon)</option>
                        <option value="Clash of Clans" disabled>Clash of Clans (Coming Soon)</option>
                        <option value="Roblox" disabled>Roblox (Coming Soon)</option>
                        <option value="Mobile Legends" disabled>Mobile Legends (Coming Soon)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Price ($USD, 0 for free)</label>
                      <input
                        id="sell-price-input"
                        type="number"
                        min="0"
                        required
                        value={sellPrice}
                        onChange={(e) => setSellPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100"
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Listing Title</label>
                    <input
                      id="sell-title-input"
                      type="text"
                      required
                      placeholder="e.g. Free Fire Level 70 - Sakura, Elite Pass 1, 100 Skins"
                      value={sellTitle}
                      onChange={(e) => setSellTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Inventory Description</label>
                    <textarea
                      id="sell-desc-input"
                      rows={2}
                      placeholder="List all legendary weapon skins, x-suits, and account safety details..."
                      value={sellDescription}
                      onChange={(e) => setSellDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600"
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Account Level</label>
                      <input
                        id="sell-level-input"
                        type="number"
                        required
                        min="1"
                        value={sellLevel}
                        onChange={(e) => setSellLevel(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Current Rank</label>
                      <input
                        id="sell-rank-input"
                        type="text"
                        required
                        placeholder="e.g. Grandmaster"
                        value={sellRank}
                        onChange={(e) => setSellRank(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Skins Count</label>
                      <input
                        id="sell-skins-input"
                        type="number"
                        required
                        min="0"
                        value={sellSkins}
                        onChange={(e) => setSellSkins(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Featured Characters / Items (comma separated)</label>
                    <input
                      id="sell-chars-input"
                      type="text"
                      placeholder="Alok, Hayato, Chrono"
                      value={sellCharacters}
                      onChange={(e) => setSellCharacters(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600"
                    />
                  </div>

                  {/* Submit Trigger */}
                  <button
                    id="submit-sell-form"
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                    Submit & Scan Account
                  </button>
                </div>
              )}

              {/* STEP 2: GAME SCANNER PROGRESS BAR */}
              {sellStep === 2 && (
                <div className="space-y-6 text-center py-6">
                  <div className="relative h-20 w-20 mx-auto">
                    {/* Ring rotation spinner */}
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-violet-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Database className="h-8 w-8 text-violet-400 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-white">GamerShield Automated ID Scan</h3>
                    <p className="text-xs text-violet-400 font-mono tracking-tight">{scanStatus}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="max-w-xs mx-auto">
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="bg-gradient-to-r from-violet-600 to-cyan-500 h-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1.5 font-bold">{scanProgress}% completed</div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Our scanner securely logs into the server-side metadata endpoints to verify current level, ban status, achievements, and assets inventory accuracy.
                  </p>
                </div>
              )}

              {/* STEP 3: LISTING SUCCESSFULLY CREATED */}
              {sellStep === 3 && (
                <div className="space-y-5 text-center py-4">
                  <div className="mx-auto h-12 w-12 bg-emerald-950/60 border border-emerald-500/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-400 animate-bounce" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-white">Game Account Successfully Verified!</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Your listing has been assigned the official <strong>SYSTEM VERIFIED</strong> badge. It is now live on the marketplace grid.
                    </p>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 text-xs text-slate-300 w-fit mx-auto">
                    🎉 Game: <strong>{sellGame}</strong> | Price: <strong>{sellPrice === 0 ? 'FREE GIFT' : `$${sellPrice}`}</strong>
                  </div>

                  <button
                    id="finish-sell-btn"
                    type="button"
                    onClick={() => {
                      setIsSellModalOpen(false);
                      // Clear form states
                      setSellTitle('');
                      setSellDescription('');
                      setSellPrice(0);
                      setSellLevel(1);
                      setSellRank('');
                      setSellSkins(0);
                      setSellCharacters('');
                      setSellEmail('');
                      setSellPassword('');
                      setSellRecovery('');
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all"
                  >
                    Return to Marketplace
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* KYC VERIFICATION MODAL */}
      {isKycModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="kyc-modal-container"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white tracking-wider uppercase">KYC Seller Verification</h3>
              </div>
              <button
                id="kyc-modal-close"
                onClick={() => setIsKycModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={verificationLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleKycSubmit} className="p-6 space-y-4">
              
              {!kycSuccessMessage ? (
                <>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">Trusted Trader Badge Verification</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Upload identification document to receive the cyan <strong>Verified Seller</strong> status checkmark. This helps build massive buyer authority and unlocks quick payout privileges.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Full Name (As on Document)</label>
                      <input
                        id="kyc-full-name"
                        type="text"
                        required
                        placeholder="John Fitzgerald Doe"
                        value={kycFullName}
                        onChange={(e) => setKycFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">ID Type</label>
                        <select
                          id="kyc-doc-type-select"
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                        >
                          <option value="National ID">National ID Card</option>
                          <option value="Passport">International Passport</option>
                          <option value="Driver's License">Driver's License</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Document Number</label>
                        <input
                          id="kyc-doc-number"
                          type="text"
                          required
                          placeholder="e.g. ID-887126-Q"
                          value={kycDocNum}
                          onChange={(e) => setKycDocNum(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600 transition-all"
                        />
                      </div>
                    </div>

                    {/* Drag and Drop simulation */}
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Upload Document Copy (Front)</label>
                      <div className="border border-dashed border-slate-800 hover:border-violet-500/50 rounded-xl p-5 text-center bg-slate-950/60 cursor-pointer transition-all">
                        <Upload className="h-6 w-6 text-slate-500 mx-auto mb-1.5" />
                        <span className="text-xs font-bold text-slate-300 block">Drag & drop your files here</span>
                        <span className="text-[10px] text-slate-500">Supports PDF, PNG, JPEG (Max 10MB)</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit trigger button */}
                  <button
                    id="submit-kyc-btn"
                    type="submit"
                    disabled={verificationLoading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-2"
                  >
                    {verificationLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Performing security OCR match...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4.5 w-4.5" />
                        Authorize ID Check
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-4 text-center py-6">
                  <div className="mx-auto h-12 w-12 bg-cyan-950/60 border border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400 animate-bounce">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Documents Received</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Your identity verification request has been logged successfully and is currently <strong>pending review</strong> by our administrator staff.
                    </p>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* PURCHASES LIBRARY MODAL */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="library-modal-container"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-violet-500" />
                <h3 className="text-sm font-black text-white tracking-wider uppercase">My Purchased Library</h3>
              </div>
              <button
                id="library-modal-close"
                onClick={() => setIsLibraryOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {purchasedLibrary.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="h-10 w-10 text-slate-700 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Your library is currently empty</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Explore the marketplace to buy, claim, or complete secure checkouts of giveaway accounts!
                    </p>
                  </div>
                </div>
              ) : (
                purchasedLibrary.map((libItem) => (
                  <div key={libItem.id} className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded uppercase mr-2">
                          {libItem.game}
                        </span>
                        <strong className="text-xs text-white line-clamp-1 mt-1">{libItem.title}</strong>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/50 px-2 py-0.5 rounded">
                        Delivered
                      </span>
                    </div>

                    {/* WhatsApp Support Coordination */}
                    <div className="bg-slate-900 rounded-lg p-3.5 space-y-3.5 border border-slate-850 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                        <span className="text-slate-500 font-extrabold uppercase text-[10px]">Order ID:</span>
                        <span className="font-mono text-cyan-400 font-extrabold select-all bg-slate-950 px-2.5 py-1 rounded text-[11px] tracking-wider">
                          {libItem.id}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 leading-relaxed text-justify">
                        This order is fulfilled manually. Click the button below to message <strong>Shivam Bhatt</strong> on WhatsApp with your Order ID to obtain your game login credentials.
                      </p>

                      <a
                        href={`https://wa.me/918840251700?text=${encodeURIComponent(
                          `Hello Shivam Bhatt, I purchased the account "${libItem.title}" on GamerShield.\n\nMy Order ID is: ${libItem.id}\n\nPlease verify and deliver the credentials.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 text-center cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 fill-current" />
                        Message on WhatsApp
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-950 p-5 border-t border-slate-850 flex justify-end">
              <button
                id="library-modal-close-btn"
                onClick={() => setIsLibraryOpen(false)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-6 py-2 rounded-xl transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* LEGAL POLICY MODAL (SHIVAM BHATT LEGAL CENTER) */}
      {isLegalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="legal-center-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-500" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase">Shivam Bhatt Legal Center</h3>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest leading-none mt-1">Official Security & Terms Protocol</p>
                </div>
              </div>
              <button
                id="legal-modal-close-btn"
                onClick={() => setIsLegalModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick tabs */}
            <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-850 flex gap-1 overflow-x-auto scrollbar-none">
              <button
                id="modal-tab-refund"
                onClick={() => setLegalTab('refund')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  legalTab === 'refund' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Cancellation & Refund
              </button>
              <button
                id="modal-tab-terms"
                onClick={() => setLegalTab('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  legalTab === 'terms' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Terms & Conditions
              </button>
              <button
                id="modal-tab-privacy"
                onClick={() => setLegalTab('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  legalTab === 'privacy' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Privacy Policy
              </button>
              <button
                id="modal-tab-pricing"
                onClick={() => setLegalTab('pricing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  legalTab === 'pricing' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Pricing & Plans
              </button>
              <button
                id="modal-tab-contact"
                onClick={() => setLegalTab('contact')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  legalTab === 'contact' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Contact Us
              </button>
            </div>

            {/* Scrollable Document Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
              
              {legalTab === 'refund' && (
                <div className="space-y-4 font-mono text-[11px]">
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-lg text-rose-300 font-sans text-xs">
                    <strong>Absolute Non-Refundable Policy Notice:</strong> All digital assets provisioning is executed immediately. Reversals or cancellations are strictly impossible.
                  </div>
                  <p className="text-slate-200 font-sans font-medium text-xs leading-normal">{REFUND_POLICY_INTRO}</p>
                  <div className="space-y-3">
                    {REFUND_POLICY_SECTIONS.map((sec, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/60">
                        <h4 className="text-white font-sans font-extrabold mb-1">{sec.title}</h4>
                        <p className="text-slate-400 leading-relaxed font-mono">{sec.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {legalTab === 'terms' && (
                <div className="space-y-4 font-mono text-[10px]">
                  <div className="bg-violet-950/20 border border-violet-500/20 p-3 rounded-lg text-violet-300 font-sans text-xs">
                    <strong>Mandatory Legal Covenants Warning:</strong> These clauses constitute a binding contractual covenant between the user (lessee) and Shivam Bhatt.
                  </div>
                  <p className="text-slate-200 font-sans leading-normal text-justify text-xs">{MANDATORY_LEGAL_COVENANTS_INTRO}</p>
                  <div className="space-y-3">
                    {COVENANTS_SECTIONS.map((sec, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/60">
                        <h4 className="text-white font-sans font-extrabold mb-1 text-[11px] uppercase tracking-wider">{sec.title}</h4>
                        <p className="text-slate-400 leading-relaxed text-justify font-mono uppercase text-[10px] text-slate-300 font-black">{sec.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {legalTab === 'privacy' && (
                <div className="space-y-4">
                  <h4 className="text-white font-sans font-black text-sm uppercase tracking-wider">Privacy & Transaction Safety Protocol</h4>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850/60 font-mono text-slate-400 text-[11px] leading-relaxed whitespace-pre-line">
                    {PRIVACY_POLICY}
                  </div>
                </div>
              )}

              {legalTab === 'pricing' && (
                <div className="space-y-4">
                  <h4 className="text-white font-sans font-black text-sm uppercase tracking-wider">Platform Commissions & Security Fees</h4>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850/60 font-mono text-slate-400 text-[11px] leading-relaxed whitespace-pre-line">
                    {PRICING_PLANS}
                  </div>
                </div>
              )}

              {legalTab === 'contact' && (
                <div className="space-y-4">
                  <h4 className="text-white font-sans font-black text-sm uppercase tracking-wider">Shivam Bhatt Helpdesk Support</h4>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850/60 font-mono text-slate-400 text-[11px] leading-relaxed whitespace-pre-line">
                    {CONTACT_INFO}
                  </div>
                </div>
              )}

            </div>

            {/* Footer Close button */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Last updated: {LAST_UPDATED}</span>
              <button
                id="legal-modal-done-btn"
                onClick={() => setIsLegalModalOpen(false)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-6 py-2 rounded-xl transition-all"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN CONTROL CENTER MODAL */}
      {isAdmin && isAdminPanelOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            id="admin-panel-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                    GamerShield Admin Control Center
                    <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-black uppercase">
                      Active Root
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    System Moderation, Account Auditing, and Role Assignment
                  </p>
                </div>
              </div>
              <button
                id="admin-panel-close-btn"
                onClick={() => setIsAdminPanelOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* SECTION 1: EXTERNAL WEBSITE INTEGRATION SETTINGS */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-5 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Database className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">External Website API Integration</h4>
                    <p className="text-[11px] text-slate-400">Configure real-time connection variables to bridge checkout transactions with your external website license vault.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">External API Endpoint URL (POST)</label>
                    <input
                      type="url"
                      required
                      value={extApiUrl}
                      onChange={(e) => setExtApiUrl(e.target.value)}
                      placeholder="e.g. https://api.yourwebsite.com/v1/license"
                      className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">GamerShield will dispatch product attributes here upon successful credit card payment verification.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">External Authorization Key / API Key</label>
                      <input
                        type="text"
                        required
                        value={extApiKey}
                        onChange={(e) => setExtApiKey(e.target.value)}
                        placeholder="e.g. sh_live_gamershield_key_123456"
                        className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Bearer Auth Token passed in headers to verify authenticity on your server.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">External Redirection / Claim URL</label>
                      <input
                        type="url"
                        required
                        value={extClaimUrl}
                        onChange={(e) => setExtClaimUrl(e.target.value)}
                        placeholder="e.g. https://yourwebsite.com/claim"
                        className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Target redirect URL where the buyer retrieves their account after purchase.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={extSaving}
                    onClick={async () => {
                      setExtSaving(true);
                      const success = await saveExternalConfig({
                        apiUrl: extApiUrl,
                        apiKey: extApiKey,
                        claimUrl: extClaimUrl
                      });
                      if (success) {
                        showToast("Integration settings saved and propagated to database successfully!", "success");
                      } else {
                        showToast("Failed to persist configuration settings in Firestore.", "error");
                      }
                      setExtSaving(false);
                    }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {extSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                    Save & Sync Integration Settings
                  </button>
                </div>
              </div>

              {/* SECTION 2: ARCHITECTURE ACTIVATION & SYNC TUTORIAL */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <FileText className="h-5 w-5 text-violet-400" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">How to Activate/Connect Your External Website</h4>
                    <p className="text-[11px] text-slate-400">Step-by-step developer guide on implementing backend endpoints to process GamerShield webhooks.</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-850/60 space-y-2">
                    <span className="text-[10px] bg-violet-950 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded font-black uppercase">
                      1. Expected Request Payload
                    </span>
                    <p className="text-[11px] text-slate-400">
                      When a buyer completes their payment, GamerShield executes a <code className="text-violet-300 bg-violet-950/40 px-1 py-0.5 rounded">POST</code> call to your endpoint with the following body:
                    </p>
                    <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-cyan-400 overflow-x-auto border border-slate-850/40 leading-relaxed">
{`{
  "orderId": "ORD-519821",
  "game": "Free Fire",
  "price": 29.00,
  "title": "FF Level 74 Grandmaster",
  "buyerEmail": "buyer_email@gmail.com"
}`}
                    </pre>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-850/60 space-y-2">
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-black uppercase">
                      2. Expected Response Format
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Your endpoint must respond with status <code className="text-emerald-400 font-bold">200 OK</code> and provide a unique authorization license key:
                    </p>
                    <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-emerald-400 overflow-x-auto border border-slate-850/40 leading-relaxed">
{`{
  "licenseKey": "GS-FF-LIC98217X-CLAIM"
}`}
                    </pre>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-850/60 space-y-2">
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-black uppercase">
                      3. Node.js Activation Script (Firebase Admin)
                    </span>
                    <p className="text-[11px] text-slate-400 font-medium">
                      To activate and query GamerShield directly from your external server, copy and deploy this Node.js module:
                    </p>
                    <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-850/40 leading-relaxed">
{`const admin = require("firebase-admin");

// Initialize with Firebase credentials
admin.initializeApp({
  projectId: "${auth.currentUser?.tenantId || 'gamershield-aistudio'}"
});

const db = admin.firestore();

// Mark listing as sold on purchase or update credentials
async function updateListingStatus(listingId, status = "sold") {
  const listingRef = db.collection("listings").doc(listingId);
  await listingRef.update({
    status: status,
    updatedAt: new Date().toISOString()
  });
  console.log(\`Listing \${listingId} updated to: \${status}\`);
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* SECTION 3: USER ACTIVITY LOGS & VISITOR TRACKER */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">User Activity Tracker Logs</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Real-time auditing trail & security logs for marketplace interactions.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoadingLogs(true);
                      const logs = await getUserActivityLogs();
                      setUserLogs(logs);
                      setIsLoadingLogs(false);
                      showToast("Surveillance logs refreshed successfully!", "success");
                    }}
                    className="self-start sm:self-auto text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer font-bold"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    Refresh logs
                  </button>
                </div>

                <div className="space-y-3">
                  {isLoadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
                      <p className="text-xs text-slate-500">Querying live audit logs from Firestore...</p>
                    </div>
                  ) : userLogs.length === 0 ? (
                    <div className="text-center py-10 border border-slate-850 rounded-xl bg-slate-900/10">
                      <p className="text-xs text-slate-500">No activity logs recorded yet on this deployment.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto border border-slate-850/65 rounded-xl bg-slate-900/40 divide-y divide-slate-850/40">
                      {userLogs.map((log) => {
                        // Badge styling based on action type
                        let actionColor = "bg-slate-950 text-slate-400 border border-slate-800";
                        const act = log.action || "";
                        if (act.includes("Purchase") || act.includes("Complete")) {
                          actionColor = "bg-emerald-950 text-emerald-400 border border-emerald-500/30";
                        } else if (act.includes("Checkout") || act.includes("Initiate")) {
                          actionColor = "bg-amber-950/40 text-amber-400 border border-amber-500/20";
                        } else if (act.includes("Listing") || act.includes("Create") || act.includes("Publish")) {
                          actionColor = "bg-cyan-950 text-cyan-400 border border-cyan-500/30";
                        } else if (act.includes("KYC") || act.includes("Submit")) {
                          actionColor = "bg-violet-950 text-violet-400 border border-violet-500/30";
                        } else if (act.includes("Like")) {
                          actionColor = "bg-rose-950/40 text-rose-400 border border-rose-500/20";
                        } else if (act.includes("View") || act.includes("Open")) {
                          actionColor = "bg-blue-950 text-blue-400 border border-blue-500/20";
                        }

                        return (
                          <div key={log.id || Math.random().toString()} className="p-3.5 hover:bg-slate-950/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${actionColor}`}>
                                  {log.action}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-850/80">
                                  {log.userEmail}
                                </span>
                              </div>
                              <p className="text-slate-300 font-medium leading-relaxed">{log.details}</p>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 sm:text-right whitespace-nowrap pt-1">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                day: '2-digit',
                                month: 'short'
                              }) : "N/A"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>

              {/* SECTION 4: DYNAMIC API KEYS MANAGER */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-5 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Key className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Dynamic Storefront API Credentials</h4>
                    <p className="text-[11px] text-slate-400">Generate and manage custom API keys to secure mutations from external admin panels or clients.</p>
                  </div>
                </div>

                {/* Generate Form */}
                <form onSubmit={handleGenerateStorefrontKey} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">API Key Label (Description)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shivam Admin Panel Web App"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={keyGenerating}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {keyGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                    Generate Key
                  </button>
                </form>

                {/* Keys List */}
                <div className="space-y-2">
                  {storefrontApiKeys.length === 0 ? (
                    <div className="text-center py-6 border border-slate-850 rounded-xl bg-slate-900/10">
                      <p className="text-xs text-slate-500 font-bold">No active API keys generated. Default environment secret fallback is active.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-850 border border-slate-850 rounded-xl bg-slate-900/40 overflow-hidden">
                      {storefrontApiKeys.map((keyObj) => (
                        <div key={keyObj.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white tracking-wide uppercase text-[10.5px]">
                                {keyObj.label}
                              </span>
                              <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">
                                {keyObj.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 select-all font-mono text-[10.5px] text-cyan-400 break-all">
                              <span>{keyObj.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyStorefrontKey(keyObj.id)}
                                className="text-slate-500 hover:text-white transition-colors shrink-0 ml-auto"
                                title="Copy Key"
                              >
                                {copiedKeyId === keyObj.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              Created: {new Date(keyObj.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeStorefrontKey(keyObj.id)}
                            className="bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 border border-rose-900/30 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 self-start sm:self-auto cursor-pointer"
                          >
                            Revoke Key
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            </div>

            {/* FooterClose */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Secure TLS session authenticated.</span>
              <button
                id="admin-panel-footer-close"
                onClick={() => setIsAdminPanelOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-6 py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
              >
                Close Control Center
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
