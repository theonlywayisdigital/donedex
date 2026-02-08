/**
 * Firestore Utilities
 * Common helpers for Firestore operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// Re-export for convenience
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  writeBatch,
  Timestamp,
};
export { db };

// Collection references
export const collections = {
  // Core collections
  users: 'users',
  organisations: 'organisations',
  superAdmins: 'super_admins',
  templates: 'templates',
  templateSections: 'template_sections',
  templateItems: 'template_items',
  records: 'records',
  reports: 'reports',
  sites: 'sites', // Legacy alias for records
  invitations: 'invitations',
  notifications: 'notifications',
  subscriptionPlans: 'subscription_plans',
  auditLog: 'audit_log',

  // Record types & fields
  recordTypes: 'record_types',
  recordTypeFields: 'record_type_fields',

  // Reports
  reportResponses: 'report_responses',
  reportPhotos: 'report_photos',
  reportUsageHistory: 'report_usage_history',

  // Team & assignments
  userRecordAssignments: 'user_record_assignments',

  // Notifications
  notificationReceipts: 'notification_receipts',
  pushTokens: 'push_tokens',

  // Documents & storage
  recordDocuments: 'record_documents',

  // User sessions
  userSessions: 'user_sessions',

  // Onboarding
  onboardingState: 'onboarding_state',

  // Library
  libraryRecordTypes: 'library_record_types',
  libraryTemplates: 'library_templates',

  // Audit & compliance
  piiDetectionEvents: 'pii_detection_events',

  // Billing
  invoices: 'invoices',
  storageAddons: 'storage_addons',
  subscriptionHistory: 'subscription_history',
} as const;

/**
 * Get a single document by ID
 */
export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName}/${docId}:`, error);
    return null;
  }
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    return [];
  }
}

/**
 * Create a document with auto-generated ID
 */
export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<{ id: string; data: T } | null> {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { id: docRef.id, data: { ...data, id: docRef.id } as T };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    return null;
  }
}

/**
 * Create a document with specific ID
 */
export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  merge: boolean = false
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    }, { merge });
    return true;
  } catch (error) {
    console.error(`Error setting ${collectionName}/${docId}:`, error);
    return false;
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  collectionName: string,
  docId: string,
  updates: Partial<DocumentData>
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error(`Error updating ${collectionName}/${docId}:`, error);
    return false;
  }
}

/**
 * Delete a document
 */
export async function removeDocument(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting ${collectionName}/${docId}:`, error);
    return false;
  }
}

/**
 * Count documents matching a query
 */
export async function countDocuments(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<number> {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error);
    return 0;
  }
}

/**
 * Generate a unique ID (for client-side ID generation)
 */
export function generateId(): string {
  return doc(collection(db, '_')).id;
}
