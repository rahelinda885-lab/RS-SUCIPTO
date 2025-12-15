export enum AgentType {
  COORDINATOR = 'HSN_COORDINATOR',
  MEDICAL_RECORDS = 'MEDICAL_RECORDS',
  BILLING = 'BILLING',
  PATIENT_INFO = 'PATIENT_INFO',
  SCHEDULING = 'SCHEDULING',
  EDUCATION = 'EDUCATION',
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  agent?: AgentType;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'video' | 'document';
    url?: string;
    title?: string;
    mimeType?: string;
  }[];
  isThinking?: boolean;
}

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemInstruction: string;
}
