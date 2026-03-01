import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, messaging } from '../firebase';

// You will need to replace this with your VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
// For testing locally without it, getToken might still work but it's highly recommended.
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

export const requestNotificationPermissionAndSaveToken = async (userId) => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (currentToken) {
                // Save the token to the user's document in Firestore
                const userRef = doc(db, 'choirMembers', userId);
                await updateDoc(userRef, { fcmToken: currentToken });
                console.log('Firebase messaging token saved.');
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Notification permission denied.');
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
    }
};
