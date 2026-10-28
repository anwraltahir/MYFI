import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDJ6Zz5elTM1fq_LZQfaiqD2Tig22BZZSg',
  authDomain: 'myfinotes.firebaseapp.com',
  projectId: 'myfinotes',
  storageBucket: 'myfinotes.firebasestorage.app',
  messagingSenderId: '1083553661893',
  appId: '1:1083553661893:web:a8c7e635bad1d5981581ac',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
