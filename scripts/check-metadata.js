import { db } from './services/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkMetadata() {
    try {
        const docRef = doc(db, 'app_updates', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log('CURRENT_METADATA:', JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.log('METADATA_MISSING: app_updates/current does not exist');
        }
    } catch (e) {
        console.error('ERROR_FETCHING_METADATA:', e);
    }
}

checkMetadata();
