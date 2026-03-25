const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'clicklogger-87c36'
});

const db = admin.firestore();

db.settings({
    databaseId: '(default)'
});

module.exports = db;