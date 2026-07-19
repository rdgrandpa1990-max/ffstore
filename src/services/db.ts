import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDoc, 
  setDoc,
  increment,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { db, auth } from "../firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isPermissionError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return msg.includes("permission") || msg.includes("insufficient") || error.code === "permission-denied";
}

export interface GameAccount {
  id: string;
  game: 'Free Fire' | 'PUBG Mobile' | 'Call of Duty' | 'Clash of Clans' | 'Roblox' | 'Mobile Legends';
  title: string;
  description: string;
  price: number;
  level: number;
  rank: string;
  skinsCount: number;
  characters: string[];
  verified: boolean; // account details verified by system scan
  sellerVerified: boolean; // seller identity verified
  sellerEmail: string;
  sellerName: string;
  credentials?: {
    email?: string;
    pass?: string;
    recoveryCode?: string;
  };
  createdAt: string;
  status: 'available' | 'sold';
  buyerEmail?: string;
  likes: number;
  views: number;
  mediaUrl?: string;
  mediaType?: string;
}

export interface VerificationRequest {
  id: string;
  sellerEmail: string;
  sellerName: string;
  documentType: string;
  documentNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  selfieUrl?: string;
}

const DEFAULT_LISTINGS: Omit<GameAccount, 'id'>[] = [
  {
    game: "Free Fire",
    title: "FF Grandmaster Account - Elite Pass S1-10 + Blue Flame Draco M1014",
    description: "Amazing Free Fire ID being given away! Level 74, Grandmaster rank, contains legendary weapon skins and rare bundles like Sakura & Hip Hop. First come first served. Absolutely free!",
    price: 0,
    level: 74,
    rank: "Grandmaster",
    skinsCount: 48,
    characters: ["Alok", "Chrono", "K", "Wukong", "Moco"],
    verified: true,
    sellerVerified: true,
    sellerEmail: "ff_pro_gamer@gmail.com",
    sellerName: "ProFireGamer",
    credentials: { email: "freefire_claim_gift_74@gmail.com", pass: "ff74DracoDraco!", recoveryCode: "FF-RECOV-9821-X" },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "available",
    likes: 142,
    views: 890
  },
  {
    game: "PUBG Mobile",
    title: "PUBG Mobile Conqueror ID - Glacier M416 (Max Level) + Mummy Set",
    description: "Conqueror Rank ID from Season 12. Glacier M416 is maxed out. Includes Golden Pharoah X-Suit, Godzilla AWM, and rare title banners. Highly secure, immediate credentials handoff.",
    price: 29,
    level: 82,
    rank: "Conqueror",
    skinsCount: 112,
    characters: ["Andy", "Carlo", "Sara", "Victor"],
    verified: true,
    sellerVerified: true,
    sellerEmail: "pubg_conq_seller@gmail.com",
    sellerName: "GlacierGod",
    credentials: { email: "pubg_glacier_m416@gmail.com", pass: "GlacierPharoah82!", recoveryCode: "PUBG-RECOV-5541-Y" },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "available",
    likes: 95,
    views: 412
  },
  {
    game: "Roblox",
    title: "Roblox ID - Max Level Blox Fruits + Dough V2 Fully Awakened",
    description: "Blox Fruits max level account (2550). Has Dough V2 fully awakened, CDK (Cursed Dual Katana), Soul Guitar, Godhuman fighting style, and 30M bounty. Fast secure transfer, email is unverified.",
    price: 15,
    level: 2550,
    rank: "Max Bounty",
    skinsCount: 35,
    characters: ["Blox Fruits", "King Legacy", "Adonis"],
    verified: true,
    sellerVerified: false,
    sellerEmail: "roblox_blox_king@gmail.com",
    sellerName: "BloxFruitMaster",
    credentials: { email: "blox_fruits_dough_v2@gmail.com", pass: "AwakenedDoughMax!", recoveryCode: "ROBLOX-RECOV-1221-A" },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "available",
    likes: 67,
    views: 310
  },
  {
    game: "Clash of Clans",
    title: "Clash of Clans TH15 - High Level Heroes & Max Defense",
    description: "TH15 account with level 85 Barbarian King, 85 Archer Queen, 60 Grand Warden, 35 Royal Champion. Max level defense, walls are mostly level 15. Supercell ID connected, full email access will be provided instantly.",
    price: 45,
    level: 184,
    rank: "Titan League",
    skinsCount: 22,
    characters: ["Barbarian King", "Archer Queen", "Grand Warden", "Royal Champion"],
    verified: true,
    sellerVerified: true,
    sellerEmail: "coc_clash_titan@gmail.com",
    sellerName: "ClanLeaderX",
    credentials: { email: "coc_th15_titan_active@gmail.com", pass: "TitanTH15Max!", recoveryCode: "COC-RECOV-3112-Q" },
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: "available",
    likes: 110,
    views: 520
  },
  {
    game: "Mobile Legends",
    title: "MLBB Mythical Glory - 120 Skins, 3 Collector Skins, Max Emblem",
    description: "Mythical Glory rank account. Includes Gusion Collector, Granger Legend, and Selena STUN. Max level physical, magic, and assassin emblems. Win rate 68%. Fast, safe delivery via escrow.",
    price: 24,
    level: 68,
    rank: "Mythical Glory",
    skinsCount: 120,
    characters: ["Gusion", "Granger", "Selena", "Chou", "Ling"],
    verified: false,
    sellerVerified: true,
    sellerEmail: "mlbb_legends_pro@gmail.com",
    sellerName: "ChouGod",
    credentials: { email: "mlbb_gusion_legend_68@gmail.com", pass: "LegendsNeverDie68!", recoveryCode: "MLBB-RECOV-4009-P" },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "available",
    likes: 38,
    views: 182
  },
  {
    game: "Free Fire",
    title: "Free Fire Level 60 Account - Free Gift / Giveaway ID",
    description: "Level 60 Free Fire account giveaway. Has some nice emotes, Elite Pass skins, and rank is Heroic. Free account for a lucky player. Complete secure checkout to get logins instantly.",
    price: 0,
    level: 60,
    rank: "Heroic",
    skinsCount: 15,
    characters: ["Alok", "Kelly", "Hayato"],
    verified: true,
    sellerVerified: false,
    sellerEmail: "freefire_giver@gmail.com",
    sellerName: "FfGiver01",
    credentials: { email: "freefire_gift_lvl60@gmail.com", pass: "Gift60HeroicFF!", recoveryCode: "FF-RECOV-1111-Z" },
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    status: "available",
    likes: 156,
    views: 940
  }
];

// Seed listings if the database is empty
export async function seedDatabaseIfNeeded(): Promise<GameAccount[]> {
  try {
    const listingsCol = collection(db, "listings");
    const snapshot = await getDocs(listingsCol);
    
    if (snapshot.empty) {
      console.log("Firestore listings collection is empty, seeding default accounts...");
      const seeded: GameAccount[] = [];
      for (const item of DEFAULT_LISTINGS) {
        const docRef = await addDoc(listingsCol, item);
        seeded.push({ id: docRef.id, ...item } as GameAccount);
      }
      return seeded;
    } else {
      const data: GameAccount[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as GameAccount);
      });
      // Sort by newest
      return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, "listings");
    }
    console.error("Error seeding or reading database:", error);
    // Return default items locally if database fails, to guarantee perfect UX
    return DEFAULT_LISTINGS.map((item, index) => ({ id: `local_${index}`, ...item } as GameAccount));
  }
}

// Get all listings
export async function getListings(): Promise<GameAccount[]> {
  try {
    const listingsCol = collection(db, "listings");
    const snapshot = await getDocs(listingsCol);
    const data: GameAccount[] = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as GameAccount);
    });
    return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, "listings");
    }
    console.error("Error reading listings:", error);
    return [];
  }
}

// Add a listing
export async function addListing(listing: Omit<GameAccount, 'id' | 'likes' | 'views' | 'createdAt' | 'status'>): Promise<GameAccount | null> {
  try {
    const listingsCol = collection(db, "listings");
    const fullListing: Omit<GameAccount, 'id'> = {
      ...listing,
      createdAt: new Date().toISOString(),
      status: 'available',
      likes: 0,
      views: 0
    };
    const docRef = await addDoc(listingsCol, fullListing);
    return { id: docRef.id, ...fullListing } as GameAccount;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, "listings");
    }
    console.error("Error adding listing:", error);
    return null;
  }
}

// Purchase a listing (Secure Escrow Execution)
export async function purchaseListing(listingId: string, buyerEmail: string): Promise<boolean> {
  try {
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().status === 'available') {
      await updateDoc(docRef, {
        status: 'sold',
        buyerEmail: buyerEmail
      });
      return true;
    }
    return false;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
    }
    console.error("Error purchasing listing:", error);
    return false;
  }
}

// Like a listing
export async function likeListing(listingId: string): Promise<void> {
  try {
    const docRef = doc(db, "listings", listingId);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
    }
    console.error("Error liking listing:", error);
  }
}

// View a listing (increment views count)
export async function incrementViews(listingId: string): Promise<void> {
  try {
    const docRef = doc(db, "listings", listingId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
    }
    console.error("Error incrementing views:", error);
  }
}

// Seller identity verification
export async function verifySellerIdentity(request: Omit<VerificationRequest, 'id' | 'status' | 'createdAt'>): Promise<VerificationRequest | null> {
  try {
    const verificationCol = collection(db, "verification_requests");
    const fullRequest: Omit<VerificationRequest, 'id'> = {
      ...request,
      status: 'pending', // Pending administrator moderation
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(verificationCol, fullRequest);
    return { id: docRef.id, ...fullRequest } as VerificationRequest;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, "verification_requests");
    }
    console.error("Error submitting seller verification:", error);
    return null;
  }
}

// Check if an email is an administrator
export async function checkIsAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  
  // The creator/developer is always an admin by default
  if (cleanEmail === 'hapa1929@gmail.com' || cleanEmail === 'alok1303@gmail.com') {
    return true;
  }
  
  try {
    const docRef = doc(db, "admins", cleanEmail);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export interface ExternalApiConfig {
  apiUrl: string;
  apiKey: string;
  claimUrl: string;
}

// Get external website integration configuration
export async function getExternalConfig(): Promise<ExternalApiConfig> {
  try {
    const docRef = doc(db, "system_settings", "external_api");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ExternalApiConfig;
    }
  } catch (err) {
    console.error("Error loading external config:", err);
  }
  // Return default placeholder settings
  return {
    apiUrl: "https://api.yourwebsite.com/v1/license",
    apiKey: "sh_live_gamershield_key_123456",
    claimUrl: "https://yourwebsite.com/claim"
  };
}

// Save external website integration configuration
export async function saveExternalConfig(config: ExternalApiConfig): Promise<boolean> {
  try {
    const docRef = doc(db, "system_settings", "external_api");
    await setDoc(docRef, config);
    return true;
  } catch (err) {
    console.error("Error saving external config:", err);
    return false;
  }
}

// Add a new administrator
export async function addAdmin(email: string, addedBy: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(db, "admins", cleanEmail);
    await setDoc(docRef, {
      email: cleanEmail,
      addedBy: addedBy,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${email}`);
    }
    console.error("Error adding admin:", error);
    return false;
  }
}

// Get the list of all administrators
export async function getAdminsList(): Promise<{ email: string; addedBy: string; createdAt: string }[]> {
  try {
    const adminsCol = collection(db, "admins");
    const snapshot = await getDocs(adminsCol);
    const list: { email: string; addedBy: string; createdAt: string }[] = [];
    
    // Always include hapa1929@gmail.com by default
    list.push({
      email: 'hapa1929@gmail.com',
      addedBy: 'System (Creator)',
      createdAt: '2026-07-14T12:00:00.000Z'
    });

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email !== 'hapa1929@gmail.com') {
        list.push({
          email: data.email,
          addedBy: data.addedBy || 'Admin',
          createdAt: data.createdAt || new Date().toISOString()
        });
      }
    });
    return list;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, "admins");
    }
    console.error("Error getting admins list:", error);
    return [{
      email: 'hapa1929@gmail.com',
      addedBy: 'System (Creator)',
      createdAt: '2026-07-14T12:00:00.000Z'
    }];
  }
}

// Remove an administrator
export async function removeAdmin(email: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'hapa1929@gmail.com') {
      return false; // Creator cannot be removed
    }
    const docRef = doc(db, "admins", cleanEmail);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${email}`);
    }
    console.error("Error removing admin:", error);
    return false;
  }
}

export interface UserActivityLog {
  id?: string;
  action: string;
  details: string;
  userEmail: string;
  timestamp: string;
}

// Log a user activity on the website
export async function logUserActivity(action: string, details: string, userEmail?: string): Promise<boolean> {
  try {
    const logsCol = collection(db, "user_logs");
    await addDoc(logsCol, {
      action,
      details,
      userEmail: userEmail || auth.currentUser?.email || "Guest User",
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error logging user activity:", error);
    return false;
  }
}

// Retrieve recent activity logs (Admin view)
export async function getUserActivityLogs(): Promise<UserActivityLog[]> {
  try {
    const logsCol = collection(db, "user_logs");
    const q = query(logsCol, orderBy("timestamp", "desc"), limit(200));
    const snapshot = await getDocs(q);
    const list: UserActivityLog[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        action: data.action || "",
        details: data.details || "",
        userEmail: data.userEmail || "Guest User",
        timestamp: data.timestamp || ""
      });
    });
    return list;
  } catch (error) {
    console.error("Error getting user activity logs with query:", error);
    // Fallback if index is not fully built or order is failing
    try {
      const logsCol = collection(db, "user_logs");
      const snapshot = await getDocs(logsCol);
      const list: UserActivityLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          action: data.action || "",
          details: data.details || "",
          userEmail: data.userEmail || "Guest User",
          timestamp: data.timestamp || ""
        });
      });
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
    } catch (fallbackError) {
      console.error("Fallback error getting user logs:", fallbackError);
      return [];
    }
  }
}
