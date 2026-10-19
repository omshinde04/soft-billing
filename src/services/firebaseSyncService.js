import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  getDocs
} from 'firebase/firestore';
import {
  createOrder,
  getProducts,
  getRetailers
} from '../database/queries.js';

export const firebaseConfig = {
  apiKey: "AIzaSyD4CJkYzwel_nrJikdYTfFV8VmjKpflRdo",
  authDomain: "mobile-app-1a08b.firebaseapp.com",
  projectId: "mobile-app-1a08b",
  storageBucket: "mobile-app-1a08b.firebasestorage.app",
  messagingSenderId: "579618093043",
  appId: "1:579618093043:web:33ae0a0955e37f9e16c486",
  measurementId: "G-9N3L3L9H5K"
};

let firebaseApp = null;
let db = null;
let unsubscribeOrders = null;

export function getFirebaseInstance() {
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
  }
  return { app: firebaseApp, db };
}

/**
 * Starts the live listening service for incoming transient orders from the salesman mobile app.
 * Automatically saves order into local SQLite database and deletes it from Firestore immediately
 * (zero cloud storage footprint, 100% private local ownership).
 */
export function startFirebaseOrderListener(mainWindow) {
  try {
    const { db } = getFirebaseInstance();
    const ordersCol = collection(db, 'transient_orders');

    console.log('[FirebaseSync] Listening for incoming mobile orders on transient_orders...');

    unsubscribeOrders = onSnapshot(
      ordersCol,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const rawData = change.doc.data();
            const docId = change.doc.id;

            console.log(`[FirebaseSync] Incoming order detected: ${rawData.order_number || docId}`);

            try {
              // 1. Save order into local SQLite database
              const savedOrder = createOrder({
                order_number: rawData.order_number,
                order_date: rawData.order_date || new Date().toISOString().slice(0, 10),
                salesman_name: rawData.salesman_name || 'Field Salesman',
                salesman_phone: rawData.salesman_phone || '',
                beat_name: rawData.beat_name || 'Market Beat',
                retailer_id: rawData.retailer_id || null,
                retailer_name: rawData.retailer_name || 'Retailer Store',
                retailer_phone: rawData.retailer_phone || '',
                retailer_address: rawData.retailer_address || '',
                notes: rawData.notes || '',
                items: rawData.items || []
              });

              console.log(`[FirebaseSync] Order #${savedOrder.order_number} saved to SQLite. Deleting from cloud...`);

              // 2. Immediately delete from Firestore so 0 bytes remain in cloud
              const docRef = doc(db, 'transient_orders', docId);
              await deleteDoc(docRef);

              console.log(`[FirebaseSync] Order #${savedOrder.order_number} purged from cloud mailbox.`);

              // 3. Notify desktop renderer live
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('orders:liveReceived', savedOrder);
              }
            } catch (err) {
              console.error(`[FirebaseSync] Error processing order ${docId}:`, err);
            }
          }
        }
      },
      (error) => {
        console.error('[FirebaseSync] Listener error:', error);
      }
    );

    return { success: true };
  } catch (error) {
    console.error('[FirebaseSync] Failed to start order listener:', error);
    return { success: false, error: error.message };
  }
}

export function stopFirebaseOrderListener() {
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
    console.log('[FirebaseSync] Stopped order listener.');
  }
}

/**
 * Pushes active product catalog and retailer directory to Firestore
 * so the mobile app has current wholesale rates, taxes, and beat information.
 */
export async function syncCatalogToCloud() {
  try {
    const { db } = getFirebaseInstance();

    const products = getProducts({ is_active: 1 });
    const retailers = getRetailers({ is_active: 1 });

    // Write products catalog
    const productsDoc = doc(db, 'catalog', 'products');
    await setDoc(productsDoc, {
      items: products.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand || '',
        category: p.category || 'General',
        sku: p.sku || '',
        selling_rate: p.selling_rate,
        mrp: p.mrp || p.selling_rate,
        tax_rate: p.tax_rate,
        pack_size: p.pack_size || 1,
        unit: p.unit || 'PCS'
      })),
      updated_at: new Date().toISOString()
    });

    // Write retailers catalog
    const retailersDoc = doc(db, 'catalog', 'retailers');
    await setDoc(retailersDoc, {
      items: retailers.map(r => ({
        id: r.id,
        shop_name: r.shop_name,
        contact_person: r.contact_person || '',
        phone: r.phone || '',
        whatsapp_number: r.whatsapp_number || r.phone || '',
        address: r.address || '',
        city: r.city || '',
        beat_name: r.beat_name || 'Market Beat',
        outstanding_balance: r.outstanding_balance || 0
      })),
      updated_at: new Date().toISOString()
    });

    return {
      success: true,
      productsCount: products.length,
      retailersCount: retailers.length
    };
  } catch (error) {
    console.error('[FirebaseSync] Catalog sync error:', error);
    return { success: false, error: error.message };
  }
}
