/* ڕێکخستنی Firebase بۆ تەکسیەکەم
 * ئەم زانیارییانە نهێنی نین (لە هەموو ئەپێکی وێبدا دیارن). پاراستنی زانیارییەکان بە یاساکانی
 * ئاسایش دەکرێت (firestore.rules)، نەک بە شاردنەوەی ئەم کلیلانە.
 */
window.TK_FIREBASE = {
  // وەشانی SDK (هەمان ژمارەی ناو Firebase Console)
  sdk: '13.1.0',
  config: {
    apiKey: 'AIzaSyA42RbHHo2l5fRlox7SxHIIZvG_cn3t4bo',
    authDomain: 'taxiakam-6d28f.firebaseapp.com',
    projectId: 'taxiakam-6d28f',
    storageBucket: 'taxiakam-6d28f.firebasestorage.app',
    messagingSenderId: '1079497273725',
    appId: '1:1079497273725:web:8b406617bb5dd1633c1c14',
  },
  // هەژماری بەڕێوەبەر (User UID لە Authentication). بۆ زیادکردنی بەڕێوەبەری تر، لێرە و لە firestore.rules زیادی بکە
  admins: ['H1rrhWrw1KRm0ZdnxK89QBetbaC3'],
  // کلیلی Google Maps (بۆ قۆناغی دووەم، نەخشەی ڕاستەقینە)
  mapsKey: 'AIzaSyBjiamkor_esVx0GV7ZM7w1LEv4fyWZEHg',
};
