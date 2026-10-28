/* پەیوەندی بە Firebase (Auth + Firestore)
 * ئەم فایلە تەنها «پردێک»ـە لە نێوان core.js و Firebase SDK. هەموو یاساکانی ئەپ لە core.js دان.
 * window.TKFB دروست دەکات و ڕووداوی «tkfb-ready» دەنێرێت.
 */
const CFG = window.TK_FIREBASE || {};
const V = CFG.sdk || '13.1.0';
const BASE = `https://www.gstatic.com/firebasejs/${V}`;

const fail = (err) => {
  window.TKFB_ERROR = err;
  window.dispatchEvent(new CustomEvent('tkfb-error', { detail: err }));
};

try {
  const [A, U, F] = await Promise.all([import(`${BASE}/firebase-app.js`), import(`${BASE}/firebase-auth.js`), import(`${BASE}/firebase-firestore.js`)]);
  let app = null;
  let auth = null;
  let db = null;

  const ref = (path) => F.doc(db, ...path.split('/'));
  /** نیشانەکانی گۆڕینی خانە: {__del}، {__union: []}، {__remove: []} */
  const fields = (data) => {
    const out = {};
    Object.keys(data).forEach((k) => {
      const v = data[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.__del) return (out[k] = F.deleteField());
        if (v.__union) return (out[k] = F.arrayUnion(...v.__union));
        if (v.__remove) return (out[k] = F.arrayRemove(...v.__remove));
      }
      out[k] = v;
    });
    return out;
  };
  const user = (u) => (u ? { uid: u.uid, email: u.email || '' } : null);

  window.TKFB = {
    real: true,
    init(role) {
      // هەر ئەپێک (سەرنشین، شۆفێر، بەڕێوەبەر) ناوێکی جیای هەیە، بۆیە لە هەمان وێبگەڕدا هەریەکەیان هەژماری خۆی دەمێنێت
      app = A.initializeApp(CFG.config, 'tk-' + role);
      try {
        auth = U.initializeAuth(app, { persistence: [U.indexedDBLocalPersistence, U.browserLocalPersistence] });
      } catch (e) {
        auth = U.getAuth(app);
      }
      try {
        db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
      } catch (e) {
        db = F.getFirestore(app);
      }
    },
    onAuth(cb) {
      return U.onAuthStateChanged(auth, (u) => cb(user(u)));
    },
    async signIn(email, pass) {
      const c = await U.signInWithEmailAndPassword(auth, email, pass);
      return user(c.user);
    },
    async signUp(email, pass) {
      const c = await U.createUserWithEmailAndPassword(auth, email, pass);
      return user(c.user);
    },
    signOut() {
      return U.signOut(auth);
    },
    async changePassword(oldPass, newPass) {
      const u = auth.currentUser;
      if (!u) throw { code: 'auth/no-user' };
      await U.reauthenticateWithCredential(u, U.EmailAuthProvider.credential(u.email, oldPass));
      await U.updatePassword(u, newPass);
    },
    /** دروستکردنی هەژمار بۆ کەسێکی تر (بەڕێوەبەر شۆفێر زیاد دەکات) بێ ئەوەی خۆی بچێتە دەرەوە */
    async createUser(email, pass) {
      const app2 = A.initializeApp(CFG.config, 'tk-create-' + Date.now());
      const a2 = U.initializeAuth(app2, { persistence: U.inMemoryPersistence });
      try {
        const c = await U.createUserWithEmailAndPassword(a2, email, pass);
        return c.user.uid;
      } finally {
        try {
          await U.signOut(a2);
          await A.deleteApp(app2);
        } catch (e) {
          /* هیچ */
        }
      }
    },
    listen(spec, onChanges, onError) {
      if (spec.doc) {
        // includeMetadataChanges: بۆ ئەوەی بزانین کەی زانیارییەکە لە سێرڤەرەوە پشتڕاست کرایەوە (نەک تەنها بیرگەی ناوخۆ)
        return F.onSnapshot(
          ref(spec.doc),
          { includeMetadataChanges: true },
          (snap) => onChanges(snap.exists() ? [{ type: 'modified', path: spec.doc, data: snap.data() }] : [{ type: 'removed', path: spec.doc }], { fromCache: snap.metadata.fromCache }),
          onError
        );
      }
      let q = F.collection(db, spec.col);
      if (spec.where) q = F.query(q, F.where(spec.where[0], spec.where[1], spec.where[2]));
      return F.onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snap) => onChanges(snap.docChanges().map((ch) => ({ type: ch.type, path: `${spec.col}/${ch.doc.id}`, data: ch.type === 'removed' ? null : ch.doc.data() })), { fromCache: snap.metadata.fromCache }),
        onError
      );
    },
    // async: هەڵەی ڕاستەوخۆ (بۆ نموونە ناونیشانی هەڵە) دەبێت بە Promiseـی ڕەتکراوە
    async write(op) {
      if (op.op === 'set') return F.setDoc(ref(op.path), op.data);
      // تەنها ئەگەر بوونی نەبوو (گەشتێک کە ئامێرێکی تر پێشتر دروستی کردووە دەست لێنادرێت)
      if (op.op === 'create') {
        return F.runTransaction(db, async (tx) => {
          const r = ref(op.path);
          const cur = await tx.get(r);
          if (!cur.exists()) tx.set(r, op.data);
        });
      }
      if (op.op === 'update') return F.updateDoc(ref(op.path), fields(op.data));
      if (op.op === 'delete') return F.deleteDoc(ref(op.path));
      return Promise.reject(new Error('bad op'));
    },
    /** سڕینەوەی کۆپی ناوخۆی Firestore (دوای چوونەدەرەوە). پاشان لاپەڕەکە نوێ دەکرێتەوە */
    async clearCache() {
      await F.terminate(db);
      await F.clearIndexedDbPersistence(db);
    },
    async get(path) {
      const s = await F.getDoc(ref(path));
      return s.exists() ? s.data() : null;
    },
  };
  window.dispatchEvent(new Event('tkfb-ready'));
} catch (err) {
  console.error('Firebase', err);
  fail(err);
}
