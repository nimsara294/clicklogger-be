const admin = require("firebase-admin");
const fs = require("fs");

// ----------------------------------------------------------------
// CONFIG — update these two values
// ----------------------------------------------------------------
const SERVICE_ACCOUNT_PATH = "./../serviceAccountKey.json"; // path to your Firebase service account JSON
const OUTPUT_FILE = "./firestore_export.json";           // where to save the exported data
// ----------------------------------------------------------------

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
 
const db = admin.firestore();
 
// ----------------------------------------------------------------
// Progress tracker
// ----------------------------------------------------------------
const progress = {
  totalDocs: 0,
  exportedDocs: 0,
  currentCollection: "",
  startTime: Date.now(),
 
  update(colName, exported, total) {
    this.currentCollection = colName;
    this.exportedDocs = exported;
    this.totalDocs = total;
    this.render();
  },
 
  render() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const percent = this.totalDocs > 0
      ? Math.round((this.exportedDocs / this.totalDocs) * 100)
      : 0;
    const barLength = 30;
    const filled = Math.round((percent / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
 
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
      `[${bar}] ${percent}% | ${this.exportedDocs}/${this.totalDocs} docs | ` +
      `Collection: ${this.currentCollection} | ${elapsed}s`
    );
  },
 
  done() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`✅ Exported ${this.exportedDocs} docs in ${elapsed}s`);
  }
};
 
// ----------------------------------------------------------------
// Count total documents across all collections (for progress bar)
// ----------------------------------------------------------------
async function countAllDocs(rootCollections) {
  let total = 0;
  for (const colRef of rootCollections) {
    const snap = await colRef.count().get();
    total += snap.data().count;
  }
  return total;
}
 
// ----------------------------------------------------------------
// Export logic
// ----------------------------------------------------------------
async function exportDocument(docRef) {
  const snap = await docRef.get();
  if (!snap.exists) return null;
 
  const data = { _id: snap.id, ...snap.data() };
 
  // Convert Firestore Timestamps to ISO strings
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value.toDate === "function") {
      data[key] = value.toDate().toISOString();
    }
  }
 
  // Recurse into subcollections
  const subcollections = await docRef.listCollections();
  if (subcollections.length > 0) {
    data.__subcollections = {};
    for (const subColRef of subcollections) {
      data.__subcollections[subColRef.id] = await exportCollection(subColRef);
    }
  }
 
  return data;
}
 
async function exportCollection(colRef) {
  const snapshot = await colRef.get();
  const docs = [];
  for (const doc of snapshot.docs) {
    const exported = await exportDocument(doc.ref);
    if (exported) {
      docs.push(exported);
      progress.exportedDocs++;
      progress.render();
    }
  }
  return docs;
}
 
// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
async function main() {
  console.log("🔍 Listing root collections...");
  const rootCollections = await db.listCollections();
 
  console.log("🔢 Counting total documents...");
  progress.totalDocs = await countAllDocs(rootCollections);
  progress.startTime = Date.now();
  console.log(`📊 Found ${progress.totalDocs} documents across ${rootCollections.length} collections\n`);
 
  const allData = {};
 
  for (const colRef of rootCollections) {
    progress.currentCollection = colRef.id;
    allData[colRef.id] = await exportCollection(colRef);
  }
 
  progress.done();
 
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
  console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}
 
main().catch((err) => {
  console.error("\n❌ Export failed:", err);
  process.exit(1);
});
 