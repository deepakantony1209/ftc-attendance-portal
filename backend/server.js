require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const cron = require('node-cron');

// Initialize Firebase Admin
let serviceAccount;
try {
    // First try to load from local file (for local development)
    serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
    // If local file is missing (e.g., on Render), parse from Environment Variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable or serviceAccountKey.json file');
    }
}

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

// Helper: Check if today is matching DD-MM
const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');

    // Assumes YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return parts[1] === tMonth && parts[2] === tDay;
    }
    return false;
};

// 2. Birthday & Anniversary Notifications (Runs daily at 8:00 AM)
cron.schedule('0 8 * * *', async () => {
    console.log('Running daily birthday/anniversary check...');
    const today = new Date();
    const isValentinesDay = today.getMonth() === 1 && today.getDate() === 14;

    try {
        const membersSnapshot = await db.collection('choirMembers').get();

        for (const doc of membersSnapshot.docs) {
            const data = doc.data();
            const fcmToken = data.fcmToken;

            if (fcmToken) {
                // Valentine's Day
                if (isValentinesDay) {
                    await sendPushNotification(fcmToken, "Happy Valentine's Day! ❤️", "Wishing you a day filled with love and joy from FTC!");
                }

                // Birthdays
                if (isToday(data.dob)) {
                    await sendPushNotification(fcmToken, "Happy Birthday! 🎂", `Wishing you a fantastic birthday, ${data.name}! From all of us at FTC.`);
                }

                // Wedding Anniversaries
                if (data.maritalStatus === 'Married' && isToday(data.weddingDate)) {
                    await sendPushNotification(fcmToken, "Happy Anniversary! 🎉", `Wishing you a wonderful wedding anniversary, ${data.name}!`);
                }
            }
        }
    } catch (err) {
        console.error('Error in daily notifications:', err);
    }
});

// 3. Event Reminders (Runs every 15 minutes checking for events 1hr and 30m away)
cron.schedule('*/15 * * * *', async () => {
    console.log('Running event reminder check...');
    const now = new Date();
    const todayStr = formatDate(now);

    const checkEvent = async (schedule, eventTypeStr, isSunday = false) => {
        if (!schedule || !schedule.time || !schedule.teamId) return;

        // Parse schedule.time (e.g. "17:00")
        const [hours, mins] = schedule.time.split(':').map(Number);
        const eventTime = new Date(now);
        eventTime.setHours(hours, mins, 0, 0);

        const diffMins = Math.floor((eventTime - now) / 60000);

        // We want exactly 1 hour (between 45-60) and 30 mins (between 15-30)
        if (diffMins > 45 && diffMins <= 60) {
            await notifyTeam(schedule.teamId, `Reminder: ${eventTypeStr} in 1 Hour`, `Please get ready. (${schedule.time})`);
        } else if (diffMins > 15 && diffMins <= 30) {
            await notifyTeam(schedule.teamId, `Reminder: ${eventTypeStr} in 30 Minutes`, `Please gather for setup. (${schedule.time})`);
        }
    };

    try {
        // 1. Check Sunday Schedule
        const sundayDoc = await db.collection('sundaySchedule').doc(todayStr).get();
        if (sundayDoc.exists) {
            await checkEvent(sundayDoc.data(), "Sunday Evening Mass", true);
        }

        // 2. Check Event Schedules for today
        const eventsSnapshot = await db.collection('eventSchedules').where('date', '==', todayStr).get();
        eventsSnapshot.forEach(async (doc) => {
            const evt = doc.data();
            await checkEvent(evt, evt.type || "Special Event", false);
        });

    } catch (err) {
        console.error('Error checking reminders:', err);
    }
});

// 4. Monthly Attendance Summary (Runs on the 1st of every month at 10:00 AM)
cron.schedule('0 10 1 * *', async () => {
    console.log('Running monthly attendance summary...');
    try {
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1); // Go back one month

        const year = lastMonthDate.getFullYear();
        const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${month}`; // e.g. "2026-02"

        // Fetch last month's attendance
        const attendanceSnapshot = await db.collection('attendanceHistory')
            .where('date', '>=', `${monthPrefix}-01`)
            .where('date', '<=', `${monthPrefix}-31`)
            .get();

        const memberStats = {};

        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const isCountable = data.scheduledTeamId !== 'na-team';
            if (!isCountable) return;

            data.records.forEach(rc => {
                if (!memberStats[rc.id]) {
                    memberStats[rc.id] = { presentCount: 0, totalCount: 0 };
                }
                if (rc.status !== 'Not Applicable') {
                    memberStats[rc.id].totalCount++;
                    if (rc.status === 'Present' || rc.status === 'Excused but Present') {
                        memberStats[rc.id].presentCount++;
                    }
                }
            });
        });

        const membersSnapshot = await db.collection('choirMembers').get();
        for (const doc of membersSnapshot.docs) {
            const user = doc.data();
            if (user.fcmToken && memberStats[doc.id]) {
                const stats = memberStats[doc.id];
                if (stats.totalCount > 0) {
                    const percentage = Math.round((stats.presentCount / stats.totalCount) * 100);
                    const monthName = lastMonthDate.toLocaleString('default', { month: 'long' });
                    await sendPushNotification(user.fcmToken, "Monthly Attendance Summary", `Your attendance for ${monthName} was ${percentage}%. (${stats.presentCount}/${stats.totalCount} events)`);
                }
            }
        }
    } catch (err) {
        console.error('Error calculating monthly summaries:', err);
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
