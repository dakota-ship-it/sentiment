import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBuDKfHcI2ZiBYMsqR7WXFGQA5lVtWbGF8",
    authDomain: "adclass-sentiment-bot.firebaseapp.com",
    projectId: "adclass-sentiment-bot",
    storageBucket: "adclass-sentiment-bot.firebasestorage.app",
    messagingSenderId: "117265438730",
    appId: "1:117265438730:web:dc23f7e29c23ca7b29e7f3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
