require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const cron = require('node-cron');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

// Helper to send FCM message to a specific token
const sendPushNotification = async (token, title, body) => {
    if (!token) return;
    try {
        const message = {
            notification: { title, body },
            token: token,
        };
        await admin.messaging().send(message);
        console.log(`Push notification sent successfully: ${title}`);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

// --- ENDPOINTS ---

app.get('/', (req, res) => {
    res.send('FTC Attendance Portal Backend is running.');
});

// 1. Endpoint to trigger Attendance Notifications
app.post('/api/notify-attendance', async (req, res) => {
    const { date, section, records } = req.body;
    if (!records || !Array.isArray(records)) {
        return res.status(400).send('Invalid records data');
    }

    let sentCount = 0;
    for (const record of records) {
        try {
            const memberDoc = await db.collection('choirMembers').doc(record.id).get();
            if (memberDoc.exists) {
                const memberData = memberDoc.data();
                if (memberData.fcmToken) {
                    const title = `Attendance Marked`;
                    const body = `You have been marked ${record.status} for ${section} on ${date}. ${record.reason ? 'Reason: ' + record.reason : ''}`;
                    await sendPushNotification(memberData.fcmToken, title, body);
                    sentCount++;
                }
            }
        } catch (err) {
            console.error(`Error processing attendance notification for ${record.id}:`, err);
        }
    }

    res.status(200).send({ message: `Notifications triggered. Sent ${sentCount} messages.` });
});

// --- CRON JOBS ---

// Helper: Format date to match event schedule 'YYYY-MM-DD'
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to find all members of a specific team ID and send them a message
const notifyTeam = async (teamId, title, body) => {
    try {
        const teamDoc = await db.collection('teams').doc(teamId).get();
        if (teamDoc.exists && teamDoc.data().members) {
            const memberIds = teamDoc.data().members;
            for (const memberId of memberIds) {
                const memberDoc = await db.collection('choirMembers').doc(memberId).get();
                if (memberDoc.exists && memberDoc.data().fcmToken) {
                    await sendPushNotification(memberDoc.data().fcmToken, title, body);
                }
            }
        }
    } catch (err) {
        console.error('Error notifying team:', err);
    }
}

// 2. Birthday & Anniversary Notifications (Runs daily at 8:00 AM)
cron.schedule('0 8 * * *', async () => {
    console.log('Running daily birthday/anniversary check...');
    const today = new Date();
    // In a real implementation you would format today's date and query members
    // matching birthday/anniversary fields, then send FCM messages.
    // Example:
    /*
    const snapshot = await db.collection('choirMembers').get();
    snapshot.forEach(async (doc) => {
        const data = doc.data();
        const fcmToken = data.fcmToken;
        if(fcmToken) {
            // Check if today matches data.dob or if it's Valentine's Day
            if (today.getMonth() === 1 && today.getDate() === 14) { // Feb 14
                 await sendPushNotification(fcmToken, "Happy Valentine's Day!", "Wishing you love and joy from FTC!");
            }
            // if (isBirthday(data.dob)) { sendPushNotification(...) }
        }
    });
    */
});

// 3. Event Reminders (Runs every 15 minutes checking for events 1hr and 30m away)
cron.schedule('*/15 * * * *', async () => {
    console.log('Running event reminder check...');
    const now = new Date();
    const todayStr = formatDate(now);

    // Check Sunday Schedules for today
    try {
        const sundayDoc = await db.collection('sundaySchedule').doc(todayStr).get();
        if (sundayDoc.exists) {
            const schedule = sundayDoc.data();
            // Assuming Evening Mass is at 17:00 (5 PM)
            const eventTime = new Date();
            eventTime.setHours(17, 0, 0, 0);

            const diffMs = eventTime - now;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins > 45 && diffMins <= 60) {
                await notifyTeam(schedule.teamId, "Reminder: Sunday Evening Mass in 1 Hour", `Your team (${schedule.teamName}) is scheduled for today's mass.`);
            } else if (diffMins > 15 && diffMins <= 30) {
                await notifyTeam(schedule.teamId, "Reminder: Sunday Evening Mass in 30 Minutes", "Please be ready for setup.");
            }
        }
    } catch (err) {
        console.error('Error checking Sunday schedule:', err);
    }

    // You would add similar logic querying `eventSchedules` checking `time` fields.
});

// 4. Monthly Attendance Summary (Runs on the 1st of every month at 10:00 AM)
cron.schedule('0 10 1 * *', async () => {
    console.log('Running monthly attendance summary...');
    // Calculate last month's stats and send to each member
    /*
    const snapshot = await db.collection('choirMembers').get();
    snapshot.forEach(async (doc) => {
        const data = doc.data();
        if (data.fcmToken) {
             const percentage = calculatePercentageForMember(doc.id, lastMonth);
             await sendPushNotification(data.fcmToken, "Monthly Attendance Summary", `Your attendance for last month was ${percentage}%.`);
        }
    });
    */
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
