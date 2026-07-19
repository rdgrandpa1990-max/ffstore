import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJRdTnP3jtgj2_mvSBcz1DgxIckr9ntbg",
  authDomain: "ffsstore-b04c0.firebaseapp.com",
  projectId: "ffsstore-b04c0",
  storageBucket: "ffsstore-b04c0.firebasestorage.app",
  messagingSenderId: "136459298847",
  appId: "1:136459298847:web:c6e8cbbc62f628ff5e4d2a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log('Testing unauthenticated write to ffsstore-b04c0 listings collection...');
  try {
    const listing = {
      game: 'Free Fire',
      title: 'Test Title',
      description: 'Test Description',
      price: 100,
      level: 50,
      rank: 'Diamond',
      skinsCount: 10,
      characters: ['Alok'],
      verified: true,
      sellerVerified: true,
      sellerEmail: 'test@admin.com',
      sellerName: 'System Verified',
      credentials: {
        email: 'test@admin.com',
        pass: 'pass123'
      },
      createdAt: new Date().toISOString(),
      status: 'available',
      likes: 0,
      views: 0
    };

    const docRef = await addDoc(collection(db, 'listings'), listing);
    console.log('Success! Listing created with ID:', docRef.id);
  } catch (err) {
    console.error('Error writing listing:', err.message || err);
  }
}

test().catch(console.error);
