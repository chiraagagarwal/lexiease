import { openDB, IDBPDatabase } from 'idb';
import { Document } from '../types';
import { MOCK_DOCUMENTS } from '../data/mockDocuments';
import { getAuthHeaders } from './auth';
import { resolveApiUrl } from './apiUtils';

const DB_NAME = 'AksharSetuDB';
const STORE_NAME = 'documents';
const DB_VERSION = 1;
const LEGACY_STORAGE_KEY = 'lexiease_documents_v1';

class DocumentService {
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase | null> {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        },
      });

      await this.migrateLegacyData(db);
      return db;
    } catch (e) {
      console.error('Failed to initialize IndexedDB:', e);
      return null;
    }
  }

  private async migrateLegacyData(db: IDBPDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const count = await store.count();

      if (count === 0) {
        // Try migrating from localStorage
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        let docsToInsert: Document[] = [];

        if (legacyData) {
          docsToInsert = JSON.parse(legacyData);
        } else {
          // If no legacy data and not in production, populate mock data for testing
          // Since we might not be in a vite context during tests, check carefully
          const isDev = typeof process !== 'undefined'
            ? process.env.NODE_ENV !== 'production'
            // @ts-ignore
            : (typeof import.meta !== 'undefined' && import.meta.env && !import.meta.env.PROD);

          if (isDev) {
            docsToInsert = [...MOCK_DOCUMENTS];
          }
        }

        for (const doc of docsToInsert) {
          await store.put(doc);
        }
        await tx.done;

        // Delete legacy data only after successful migration
        if (legacyData) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          console.log('Successfully migrated documents from localStorage to IndexedDB.');
        }
      }
    } catch (e) {
      console.warn('Migration failed or skipped:', e);
    }
  }

  public async getDocuments(): Promise<Document[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    try {
      return await db.getAll(STORE_NAME);
    } catch (e) {
      console.error('Failed to get documents:', e);
      return [];
    }
  }

  public async getDocument(id: string): Promise<Document | null> {
    const db = await this.dbPromise;
    if (!db) return null;
    try {
      return await db.get(STORE_NAME, id) || null;
    } catch (e) {
      console.error(`Failed to get document ${id}:`, e);
      return null;
    }
  }

  public async saveDocument(doc: Document): Promise<Document> {
    const db = await this.dbPromise;
    if (!db) throw new Error('Database not initialized');

    try {
      const existing = await this.getDocument(doc.id);
      const toSave = { ...doc, updatedAt: new Date().toISOString() };

      // If we're not providing a new originalFile, try to keep the old one if it existed
      if (!toSave.originalFile && existing && existing.originalFile) {
        toSave.originalFile = existing.originalFile;
      }

      await db.put(STORE_NAME, toSave);
      return toSave;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        throw new Error('Storage limit reached. Please delete some documents before saving new ones.');
      }
      console.error('Failed to save document:', e);
      throw e;
    }
  }

  public async deleteDocument(id: string): Promise<boolean> {
    const db = await this.dbPromise;
    if (!db) return false;
    try {
      await db.delete(STORE_NAME, id);
      return true;
    } catch (e) {
      console.error(`Failed to delete document ${id}:`, e);
      return false;
    }
  }

  public async updateProgress(id: string, progress: number): Promise<void> {
    const doc = await this.getDocument(id);
    if (doc) {
      doc.progressPercent = Math.min(100, Math.max(0, progress));
      await this.saveDocument(doc);
    }
  }

  public async digitise(file: File | { name: string; size: number; textContent?: string }, onProgress?: (step: 'idle' | 'uploading' | 'processing' | 'extracting' | 'formatting' | 'success' | 'error') => void): Promise<Document> {
    const docId = `doc_${Date.now()}`;
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

    let sampleBody = "";

    if (file instanceof File) {
      const formData = new FormData();
      formData.append("file", file);

      onProgress?.('uploading');
      const response = await fetch(resolveApiUrl("/api/document/parse"), {
        method: "POST",
        headers: await getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        let errDetails = response.statusText;
        try {
          const errData = await response.json();
          errDetails = errData.detail || JSON.stringify(errData);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`Failed to start OCR parsing: ${errDetails}`);
      }

      const { task_id } = await response.json();

      const maxAttempts = 60;
      let attempts = 0;
      let consecutive404s = 0;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await fetch(resolveApiUrl(`/api/document/tasks/${task_id}`), {
          headers: await getAuthHeaders()
        });
        if (!statusResponse.ok) {
           if (statusResponse.status === 404) {
             consecutive404s++;
             if (consecutive404s <= 5) continue;
           }
           let errDetails = statusResponse.statusText;
           try { errDetails = await statusResponse.text(); } catch {}
           throw new Error(`Failed to check task status: ${errDetails}`);
        }
        consecutive404s = 0;

        const statusData = await statusResponse.json();
        if (statusData.status === "complete") {
          onProgress?.('extracting');
          sampleBody = statusData.result;
          break;
        } else if (statusData.status === "failed" || statusData.status === "rejected") {
          const failMsg = statusData.error || statusData.detail || "Server OCR task failed";
          throw new Error(`OCR processing failed: ${failMsg}`);
        } else if (statusData.status === "not_found") {
          throw new Error("OCR task not found");
        }
      }

      if (attempts >= maxAttempts && !sampleBody) {
        throw new Error("OCR document parsing timed out after 2 minutes. Please try again with a smaller or clearer file.");
      }
    } else if ('textContent' in file && typeof file.textContent === 'string') {
      sampleBody = file.textContent;
    }

    if (!sampleBody) {
       sampleBody = "No text could be extracted.";
    }

    const paragraphs = sampleBody.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const wordCount = sampleBody.trim().split(/\s+/).length;

    const newDoc: Document = {
      id: docId,
      title: cleanTitle,
      category: 'Science',
      language: 'en-IN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progressPercent: 0,
      totalWords: wordCount,
      estimatedReadTimeMinutes: Math.max(1, Math.ceil(wordCount / 120)),
      originalViewStyle: {
        headerColor: '#1E40AF',
        chapterNumber: 'EXTRACTED OCR',
        subheading: 'Digitized Educational Document',
        accentColor: '#3B82F6'
      },
      pages: [
        {
          pageNumber: 1,
          content: sampleBody,
          paragraphs: paragraphs,
        }
      ],
      status: 'completed',
      originalFile: file instanceof File ? file : undefined
    };

    return await this.saveDocument(newDoc);
  }
}

export const documentService = new DocumentService();
