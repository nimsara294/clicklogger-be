const { MongoClient } = require("mongodb");
const fs = require("fs");

// ----------------------------------------------------------------
// CONFIG — update these values
// ----------------------------------------------------------------
const MONGO_URI = "mongodb+srv://nethumnimsara294_db_user:admin123@cluster0.wkxw6zk.mongodb.net/?appName=Cluster0"; // your Atlas connection string
const DATABASE_NAME = "click_logger";   // target DB name in Atlas
const INPUT_FILE = "./firestore_export.json";  // output from firestore_export.js
const FLATTEN_SUBCOLLECTIONS = true;           // if true, subcollections become separate collections
// ----------------------------------------------------------------

/**
 * Flattens __subcollections out of documents and registers them
 * as separate top-level collections for MongoDB.
 *
 * e.g. users/{id}/__subcollections/orders → users_orders collection
 */
function extractCollections(data) {
  const collections = {};

  for (const [colName, docs] of Object.entries(data)) {
    collections[colName] = [];

    for (const doc of docs) {
      const { __subcollections, ...cleanDoc } = doc;
      collections[colName].push(cleanDoc);

      if (FLATTEN_SUBCOLLECTIONS && __subcollections) {
        for (const [subColName, subDocs] of Object.entries(__subcollections)) {
          const flatName = `${colName}_${subColName}`;
          if (!collections[flatName]) collections[flatName] = [];

          // Tag each subdoc with its parent ID for reference
          const taggedDocs = subDocs.map(({ __subcollections: nested, ...d }) => ({
            ...d,
            _parentId: doc._id,
          }));
          collections[flatName].push(...taggedDocs);

          // Recurse if there are deeper subcollections
          if (nested) {
            const nestedData = { [`${flatName}_${subColName}`]: [{ ...nested }] };
            const nestedCollections = extractCollections(nestedData);
            Object.assign(collections, nestedCollections);
          }
        }
      }
    }
  }

  return collections;
}

async function main() {
  console.log(`📂 Reading export file: ${INPUT_FILE}`);
  const raw = fs.readFileSync(INPUT_FILE, "utf-8");
  const firestoreData = JSON.parse(raw);

  const collections = extractCollections(firestoreData);

  console.log(`\n🔌 Connecting to MongoDB Atlas...`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log(`✅ Connected!`);

  const db = client.db(DATABASE_NAME);

  for (const [colName, docs] of Object.entries(collections)) {
    if (docs.length === 0) {
      console.log(`⏭️  Skipping empty collection: ${colName}`);
      continue;
    }

    console.log(`📥 Importing ${docs.length} docs → ${DATABASE_NAME}.${colName}`);

    const col = db.collection(colName);

    // Insert in batches of 500 to avoid overwhelming Atlas
    const BATCH_SIZE = 500;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      await col.insertMany(batch, { ordered: false });
    }

    console.log(`   ✅ Done`);
  }

  await client.close();
  console.log(`\n🎉 Migration complete! Database: ${DATABASE_NAME}`);
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});