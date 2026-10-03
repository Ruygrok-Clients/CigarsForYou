import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { completeDiditSignup, diditErrorMessage } from '../lib/didit';
import type { UserProfile } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMemberOrAdmin: boolean;
  /** Admin, member, or marketing staff — can enter the portal */
  canAccessPortal: boolean;
  isMarketingStaff: boolean;
  /** Admin, member, or marketing staff — can manage News & SEO */
  canManageNews: boolean;
  signUp: (
    email: string,
    pass: string,
    name: string,
    verification: { pendingSignupId?: string; sessionId?: string }
  ) => Promise<void>;
  logIn: (email: string, pass: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);
        return profile;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (
    email: string,
    pass: string,
    name: string,
    verification: { pendingSignupId?: string; sessionId?: string }
  ) => {
    try {
      await completeDiditSignup({
        email,
        password: pass,
        displayName: name,
        pendingSignupId: verification.pendingSignupId,
        sessionId: verification.sessionId
      });
    } catch (err) {
      throw new Error(diditErrorMessage(err, 'Could not create the account.'));
    }

    const res = await signInWithEmailAndPassword(auth, email, pass);
    await fetchProfile(res.user.uid);
  };

  const logIn = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await fetchProfile(res.user.uid);
  };

  const logOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isMemberOrAdmin = userProfile?.role === 'admin' || userProfile?.role === 'member';
  const isMarketingStaff = userProfile?.role === 'marketing';
  const canAccessPortal = isMemberOrAdmin || isMarketingStaff;
  const canManageNews = isMemberOrAdmin || isMarketingStaff;

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      isAdmin,
      isMemberOrAdmin,
      canAccessPortal,
      isMarketingStaff,
      canManageNews,
      signUp,
      logIn,
      logOut,
      resetPassword,
      updateUserProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
