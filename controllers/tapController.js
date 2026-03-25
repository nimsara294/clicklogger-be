const saveTaps = (req, res) => {

    const { id, var: devicePlatform, taps } = req.body;

    console.log('═══════════════════════════════');
    console.log('Session ID        :', id);
    console.log('Device Platform   :', devicePlatform);
    console.log('Total Taps        :', taps.length);
    console.log('───────────────────────────────');

    taps.forEach((tap) => {
        console.log(`Tap #${tap.tapSequenceNumber}`);
        console.log('  Start Timestamp :', tap.startTimestamp);
        console.log('  End Timestamp   :', tap.endTimestamp);
        console.log('  Interface Type  :', tap.interface);
        console.log('  Interface Seq   :', tap.interfaceSequence);
        console.log('───────────────────────────────');
    });

    res.json({ message: 'Data saved successfully' });

};

module.exports = { saveTaps };