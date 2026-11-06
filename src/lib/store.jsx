import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, GoogleAuthProvider, signInWithPopup, updateProfile,
} from 'firebase/auth';
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, firebaseEnabled } from './firebase.js';
import { seedDemo } from './seed.js';

/* ------------------------------------------------------------------ *
 * Demo backend — localStorage with a tiny pub/sub so hooks re-render.
 * ------------------------------------------------------------------ */
const LS = 'backline:v1:';
const listeners = new Map();
const lsGet = (k, d) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* storage full or blocked */ } (listeners.get(k) || []).forEach((fn) => fn(v)); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const demo = {
  list: (col) => lsGet('col:' + col, []),
  subscribe(col, fn) {
    const k = 'col:' + col;
    if (!listeners.has(k)) listeners.set(k, new Set());
    listeners.get(k).add(fn);
    fn(lsGet(k, []));
    return () => listeners.get(k).delete(fn);
  },
  async add(col, data) {
    const item = { createdAt: new Date().toISOString(), ...data, id: uid() };
    lsSet('col:' + col, [item, ...demo.list(col)]);
    return item;
  },
  async update(col, id, patch) {
    lsSet('col:' + col, demo.list(col).map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)));
  },
  async remove(col, id) {
    lsSet('col:' + col, demo.list(col).filter((x) => x.id !== id));
  },
  reset() {
    Object.keys(localStorage).filter((k) => k.startsWith(LS)).forEach((k) => localStorage.removeItem(k));
  },
};

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [business, setBusiness] = useState(null);
  const [bizLoading, setBizLoading] = useState(true);

  // --- auth state
  useEffect(() => {
    if (!firebaseEnabled) {
      setUser(lsGet('user', null));
      setBusiness(lsGet('business', null));
      setBizLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u ? { uid: u.uid, email: u.email, name: u.displayName || u.email } : null);
      if (!u) { setBusiness(null); setBizLoading(false); return; }
      setBizLoading(true);
      const prof = await getDoc(doc(db, 'users', u.uid));
      const bizId = prof.exists() ? prof.data().bizId : null;
      if (bizId) {
        const b = await getDoc(doc(db, 'businesses', bizId));
        setBusiness(b.exists() ? { id: b.id, ...b.data() } : null);
      } else setBusiness(null);
      setBizLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!firebaseEnabled) { const u = { uid: 'demo', email, name: email.split('@')[0] }; lsSet('user', u); setUser(u); return; }
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    if (!firebaseEnabled) { const u = { uid: 'demo', email, name }; lsSet('user', u); setUser(u); return; }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!firebaseEnabled) return signIn('owner@demo.ng', 'demo');
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, [signIn]);

  const startDemo = useCallback(() => {
    demo.reset();
    const { user: u, business: b, collections } = seedDemo();
    Object.entries(collections).forEach(([col, items]) => lsSet('col:' + col, items));
    lsSet('user', u); lsSet('business', b);
    setUser(u); setBusiness(b);
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseEnabled) { demo.reset(); setUser(null); setBusiness(null); return; }
    await fbSignOut(auth);
  }, []);

  const saveBusiness = useCallback(async (data) => {
    if (!firebaseEnabled) {
      const b = { id: 'demo-biz', ...(lsGet('business', {}) || {}), ...data };
      lsSet('business', b); setBusiness(b); return b;
    }
    if (business?.id) {
      await updateDoc(doc(db, 'businesses', business.id), data);
      const b = { ...business, ...data }; setBusiness(b); return b;
    }
    const ref = doc(collection(db, 'businesses'));
    const b = { ...data, members: [user.uid], owner: user.uid, createdAt: serverTimestamp() };
    await setDoc(ref, b);
    await setDoc(doc(db, 'users', user.uid), { bizId: ref.id, email: user.email }, { merge: true });
    const out = { id: ref.id, ...b }; setBusiness(out); return out;
  }, [business, user]);

  // --- generic CRUD bound to the current business
  const api = useMemo(() => {
    if (!firebaseEnabled) return demo;
    const path = (col) => collection(db, 'businesses', business?.id || '_', col);
    // Firestore rejects `undefined`; strip it (and the local id) before writing.
    const clean = (o) => { const { id: _id, ...rest } = JSON.parse(JSON.stringify(o)); return rest; };
    return {
      subscribe: (col, fn) => onSnapshot(path(col), (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        fn(rows);
      }),
      add: async (col, data) => { const item = clean({ ...data, createdAt: new Date().toISOString() }); const r = await addDoc(path(col), item); return { id: r.id, ...item }; },
      update: (col, id, patch) => updateDoc(doc(path(col), id), clean({ ...patch, updatedAt: new Date().toISOString() })),
      remove: (col, id) => deleteDoc(doc(path(col), id)),
    };
  }, [business?.id]);

  const value = { user, business, bizLoading, signIn, signUp, signInGoogle, signOut, startDemo, saveBusiness, api, demoMode: !firebaseEnabled };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Live list of a business sub-collection, e.g. useCollection('invoices'). */
export function useCollection(col) {
  const { api, business } = useApp();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!business) return;
    return api.subscribe(col, setRows);
  }, [api, business, col]);
  return rows;
}
