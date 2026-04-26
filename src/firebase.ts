import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Login Error:", error.code, error.message);
    throw error;
  }
}

/**
 * Persists a site report to Firestore.
 */
export async function saveSiteReport(reportId: string, siteMode: 'stationary' | 'mobility') {
  try {
    const reportRef = doc(db, 'reports', reportId);
    await setDoc(reportRef, {
      id: reportId,
      siteMode,
      createdAt: Date.now(),
      syncTime: serverTimestamp()
    });
    return true;
  } catch (error: any) {
    console.error("Error saving site report:", error);
    return false;
  }
}

/**
 * Logs a specific test result within a site report.
 */
export async function logTestResult(reportId: string, resultData: any) {
  try {
    const resultsCollection = collection(db, 'reports', reportId, 'results');
    
    // Sanitize data: Firestore does not support 'undefined'
    const sanitizedData = { ...resultData };
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] === undefined) {
        sanitizedData[key] = null;
      }
    });

    const resultId = sanitizedData.id || `res_${Math.random().toString(36).substring(2, 10)}`;
    const resultRef = doc(db, 'reports', reportId, 'results', resultId);
    
    await setDoc(resultRef, {
      ...sanitizedData,
      id: resultId,
      syncTime: serverTimestamp()
    });
    return true;
  } catch (error: any) {
    console.error("Error logging test result:", error);
    return false;
  }
}

/**
 * Admin: Issue a new license
 */
export async function issueLicense(deviceId: string, expiryDays: number, userEmail?: string, issuerEmail?: string) {
  const expiry = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);
  const raw = `${deviceId}|${expiry}|NTS-2025`;
  const key = btoa(raw);
  
  const licenseRef = doc(db, 'licenses', key);
  await setDoc(licenseRef, {
    key,
    deviceId,
    expiry,
    issuedAt: Date.now(),
    issuer: issuerEmail || 'system',
    status: 'active',
    userEmail: userEmail || ''
  });
  
  return key;
}

/**
 * Admin: Revoke a license
 */
export async function revokeLicense(key: string) {
  const licenseRef = doc(db, 'licenses', key);
  await setDoc(licenseRef, { status: 'revoked' }, { merge: true });
}

/**
 * Admin: Toggle user disabled status
 */
export async function toggleUserStatus(uid: string, isDisabled: boolean) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { isDisabled }, { merge: true });
}

/**
 * Track user last seen and registration
 */
export async function trackUser(user: User) {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    lastSeen: Date.now()
  }, { merge: true });
}

async function testConnection() {
  try {
    // Attempt to fetch a dummy document from the server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified successfully.");
  } catch (error: any) {
    if (error && error.message && error.message.includes('the client is offline')) {
      console.error("Firestore Error: The client is offline.");
    } else if (error && error.code === 'unavailable') {
      console.error("Firestore Error: Service unavailable.");
    }
  }
}

testConnection();
