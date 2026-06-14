export type RecentKarguzari = {
  _id: string;
  meetingDate: string;
  timeSlot: string;
  text: string;
  attendeeNames: string[];
};

export type DirectoryEntry = {
  _id: string;
  source: 'account' | 'person';
  type: 'sathi' | 'student';
  name: string;
  masjid: string;
  schoolName?: string;
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
