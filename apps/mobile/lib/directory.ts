export type RecentKarguzari = {
  _id: string;
  meetingDate: string;
  timeSlot: string;
  text: string;
  author?: { name?: string };
  attendeeNames: string[];
};

export type DirectoryEntry = {
  _id: string;
  source: 'account' | 'person';
  type: 'sathi' | 'student';
  name: string;
  masjid: string;
  schoolName?: string;
  classValue?: number | null;
  mobile?: string;
  canDelete?: boolean;
  recentKarguzari?: RecentKarguzari[];
};

export type BatchRecipient = DirectoryEntry & { mobile: string };

export type BatchSmsRecipient = {
  _id?: string;
  targetId: string;
  personId?: string;
  name: string;
  mobile: string;
  type: 'sathi' | 'student';
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  errorMessage?: string;
};

export type BatchSmsLog = {
  _id: string;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  recipients: BatchSmsRecipient[];
  sender?: { name: string };
  createdAt: string;
  encoding: 'gsm' | 'unicode';
  charCount: number;
};

export type SingleSmsLog = {
  kind: 'single';
  _id: string;
  targetId: string;
  recipientName: string;
  recipientMobile: string;
  message: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  sender?: { name: string };
  createdAt: string;
  encoding: 'gsm' | 'unicode';
  charCount: number;
};

export type BatchSmsHistoryItem = {
  kind: 'batch';
  _id: string;
  message: string;
  status: BatchSmsLog['status'];
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  sender?: { name: string };
  createdAt: string;
  encoding: 'gsm' | 'unicode';
  charCount: number;
};

export type SmsHistoryItem = SingleSmsLog | BatchSmsHistoryItem;
