import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from './config';

export async function signUpWithEmail(email: string, pass: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (userCredential.user) {
    try {
      await sendEmailVerification(userCredential.user);
    } catch (err) {
      console.warn('Could not send email verification immediately:', err);
    }
  }
  return userCredential.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInGuestUser() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.warn('Anonymous auth failed or not allowed in Firebase console:', err);
    return null;
  }
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendEmailVerification(user: User) {
  await sendEmailVerification(user);
}

export async function logOutUser() {
  await signOut(auth);
}

