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
}

