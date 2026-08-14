import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile, createUserProfile, updateUserProfile } from '../firebase/db';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  loginAsDemoUser: (name?: string, email?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfileData: async () => {},
  loginAsDemoUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return localStorage.getItem('examprep_demo_mode') === 'true';
  });

  const loginAsDemoUser = (name = 'Aspirant Student', email = 'demo@examprep.ai') => {
    localStorage.setItem('examprep_demo_mode', 'true');
    setIsDemoUser(true);
    const demoUid = 'demo_user_123';
    const mockUser = {
      uid: demoUid,
      email,
      displayName: name,
      emailVerified: true,
      photoURL: '',
    } as User;

    setCurrentUser(mockUser);
    setUserProfile({
      uid: demoUid,
      email,
      displayName: name,
      photoURL: '',
      targetExam: 'UPSC CSE',
      targetExamDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dailyStudyHours: 4,
      emailVerified: true,
      isOnboarded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const fetchProfile = async (user: User) => {
    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        // Create initial profile
        profile = await createUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Student',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified,
          isOnboarded: false,
        });
      }
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to load user profile from Firestore:', err);
      // Fallback in-memory profile if Firestore permissions or connection pending
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Student',
        photoURL: user.photoURL || '',
        targetExam: 'SSC CGL',
        targetExamDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyStudyHours: 3,
        emailVerified: user.emailVerified,
        isOnboarded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const refreshProfile = async () => {
    if (currentUser && !isDemoUser) {
      await fetchProfile(currentUser);
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (currentUser) {
      if (!isDemoUser) {
        try {
          await updateUserProfile(currentUser.uid, updates);
        } catch (err) {
          console.warn('Failed to persist profile update to Firestore:', err);
        }
      }
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  useEffect(() => {
    if (isDemoUser && !currentUser) {
      loginAsDemoUser();
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        localStorage.removeItem('examprep_demo_mode');
        setIsDemoUser(false);
        setCurrentUser(user);
        await fetchProfile(user);
      } else if (!isDemoUser) {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        refreshProfile,
        updateProfileData,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
