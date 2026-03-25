const db = require('../config/firebase');

const saveTaps = async (req, res) => {

    const { id, var: devicePlatform, taps } = req.body;

    console.log('═══════════════════════════════');
    console.log('Session ID        :', id);
    console.log('Device Platform   :', devicePlatform);
    console.log('Total Taps        :', taps.length);
    console.log('───────────────────────────────');

    try {

        const batch = db.batch();

        // 1. Write session document to sessions collection
        const sessionRef = db.collection('sessions').doc(id);
        batch.set(sessionRef, {
            sessionId:                      id,
            devicePlatform:                 devicePlatform,
            totalTaps:                      taps.length,
            interfaceVariationsCompleted:   Math.max(...taps.map(t => t.interfaceSequence)),
            createdAt:                      new Date()
        });

        // 2. Write each tap as a flat document in tap_logs collection
        taps.forEach((tap) => {

            console.log(`Tap #${tap.tapSequenceNumber}`);
            console.log('  Start Timestamp :', tap.startTimestamp);
            console.log('  End Timestamp   :', tap.endTimestamp);
            console.log('  Interface Type  :', tap.interface);
            console.log('  Interface Seq   :', tap.interfaceSequence);
            console.log('───────────────────────────────');

            const tapRef = db.collection('tap_logs').doc();

            batch.set(tapRef, {
                sessionId:          id,
                devicePlatform:     devicePlatform,      // duplicated for direct querying
                tapSequenceNumber:  tap.tapSequenceNumber,
                startTimestamp:     tap.startTimestamp,
                endTimestamp:       tap.endTimestamp,
                duration:           tap.endTimestamp - tap.startTimestamp,  // stored, not computed
                interfaceType:      tap.interface,
                interfaceSequence:  tap.interfaceSequence,
                createdAt:          new Date()
            });

        });

        await batch.commit();

        console.log(`✓ Session saved to sessions collection`);
        console.log(`✓ ${taps.length} taps saved to tap_logs collection`);
        res.json({ message: 'Data saved successfully' });

    } catch (error) {

        console.error('Firestore error:', error);
        res.status(500).json({ message: 'Failed to save data', error: error.message });

    }

};

module.exports = { saveTaps };