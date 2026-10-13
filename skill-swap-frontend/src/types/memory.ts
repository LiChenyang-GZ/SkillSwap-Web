export interface MemoryEntry {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string;
  content?: string;
  mediaUrls: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  editLockOwnerId?: string;
  editLockOwnerName?: string;
  editLockExpiresAt?: string;
  // Optimistic-locking version; sent back on update/delete so stale writes are rejected.
  version?: number;
}

