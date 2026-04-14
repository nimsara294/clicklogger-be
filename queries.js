const db = require('./config/firebase');

// ═══════════════════════════════════════════════════════════════
// a. Mean tap duration for Android vs PC users
// ═══════════════════════════════════════════════════════════════

async function meanDurationByDevice() {

    const results = { android: { total: 0, count: 0 }, pc: { total: 0, count: 0 } };

    const snapshot = await db.collection('tap_logs').get();

    snapshot.forEach((doc) => {
        const data = doc.data();
        const platform = data.devicePlatform.toLowerCase();

        if (results[platform] !== undefined) {
            results[platform].total += data.duration;
            results[platform].count += 1;
        }
    });

    console.log('═══════════════════════════════════════');
    console.log('a. Mean Tap Duration: Android vs PC');
    console.log('═══════════════════════════════════════');
    console.log('Android : ' + (results.android.count > 0
        ? (results.android.total / results.android.count).toFixed(2) + ' ms (' + results.android.count + ' taps)'
        : 'No data'));
    console.log('PC      : ' + (results.pc.count > 0
        ? (results.pc.total / results.pc.count).toFixed(2) + ' ms (' + results.pc.count + ' taps)'
        : 'No data'));
    console.log('');

}

// ═══════════════════════════════════════════════════════════════
// b. Mean tap duration: feedbackshown vs nofeedback
// ═══════════════════════════════════════════════════════════════

async function meanDurationByInterface() {

    const results = { feedbackshown: { total: 0, count: 0 }, nofeedback: { total: 0, count: 0 } };

    const snapshot = await db.collection('tap_logs').get();

    snapshot.forEach((doc) => {
        const data = doc.data();
        const interfaceType = data.interfaceType;

        if (results[interfaceType] !== undefined) {
            results[interfaceType].total += data.duration;
            results[interfaceType].count += 1;
        }
    });

    console.log('═══════════════════════════════════════');
    console.log('b. Mean Tap Duration: feedbackshown vs nofeedback');
    console.log('═══════════════════════════════════════');
    console.log('feedbackshown : ' + (results.feedbackshown.count > 0
        ? (results.feedbackshown.total / results.feedbackshown.count).toFixed(2) + ' ms (' + results.feedbackshown.count + ' taps)'
        : 'No data'));
    console.log('nofeedback    : ' + (results.nofeedback.count > 0
        ? (results.nofeedback.total / results.nofeedback.count).toFixed(2) + ' ms (' + results.nofeedback.count + ' taps)'
        : 'No data'));
    console.log('');

}

// ═══════════════════════════════════════════════════════════════
// c. Users who completed both variations vs dropped off
// ═══════════════════════════════════════════════════════════════

async function completionRate() {

    const snapshot = await db.collection('sessions').get();

    let completed = 0;
    let droppedOff = 0;

    snapshot.forEach((doc) => {
        const data = doc.data();

        // interfaceVariationsCompleted = 2 means they did both rounds
        if (data.interfaceVariationsCompleted >= 2) {
            completed++;
        } else {
            droppedOff++;
        }
    });

    const total = completed + droppedOff;

    console.log('═══════════════════════════════════════');
    console.log('c. Session Completion Rate');
    console.log('═══════════════════════════════════════');
    console.log('Total sessions       : ' + total);
    console.log('Completed both       : ' + completed + (total > 0 ? ' (' + ((completed / total) * 100).toFixed(1) + '%)' : ''));
    console.log('Dropped off          : ' + droppedOff + (total > 0 ? ' (' + ((droppedOff / total) * 100).toFixed(1) + '%)' : ''));
    console.log('');

}

// ═══════════════════════════════════════════════════════════════
// Run all queries
// ═══════════════════════════════════════════════════════════════

async function runAll() {
    try {
        await meanDurationByDevice();
        await meanDurationByInterface();
        await completionRate();
        process.exit(0);
    } catch (error) {
        console.error('Query error:', error);
        process.exit(1);
    }
}

runAll();