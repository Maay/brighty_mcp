export interface Money {
  amount: string;
  currency: string;
}

export interface Account {
  id: string;
  ownerId: string;
  holderId: string;
  name: string;
  balance: Money;
  type: "CURRENT" | "SAVING";
  openedAt: string;
}

export interface AccountAddress {
  type: string;
  address: string;
  network?: string;
}

export interface Payout {
  id: string;
  name: string;
  description?: string;
  state: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  createdAt: string;
  startedAt?: string;
  totalTransfers: number;
  paidTransfers: number;
  totalAmount: Money;
  paidAmount: Money;
}

export interface PayoutTransfer {
  id: string;
  payoutId: string;
  type: "INTERNAL" | "EXTERNAL";
  state: string;
  sourceAccountId?: string;
  amount: Money;
  recipient: {
    name?: string;
    accountId?: string;
    iban?: string;
    address?: string;
  };
}

export interface Card {
  id: string;
  cardOwnerId: string;
  cardHolderId: string;
  status: "CREATED" | "ACTIVE" | "FROZEN" | "TERMINATED";
  name: string;
  type: "DEBIT";
  network: "MASTERCARD";
  formFactor: "VIRTUAL" | "PHYSICAL";
  lastFour: string;
  bin: string;
  expirationDate: string;
  cardHolderName: string;
  securityPolicy: {
    contactless: boolean;
    internet: boolean;
    atm: boolean;
    pos: boolean;
    ecommerce: boolean;
  };
  spendingStrategy: {
    name: string;
    accountId: string;
    currency: string;
  };
  spendingLimit?: {
    name: string;
    setAt: string;
    since: string;
    until: string;
    limit: Money;
    spentAmount: Money;
  };
  limitAmount?: Money;
  availableAmount?: Money;
}

export interface CardDesign {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Member {
  customer: {
    id: string;
    username: string;
    name: string;
    picture?: string;
  };
  membership: {
    memberId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    state: "ACTIVE" | "TERMINATED";
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  legalData?: {
    name?: string;
    address?: string;
    birthDate?: string;
    birthPlace?: string;
    nationality?: string;
    countryOfResidence?: string;
    legalSex?: string;
  };
}

export interface TransferIntent {
  sourceAccountId: string;
  targetAccountId: string;
  sourceAmount: Money;
  targetAmount: Money;
  exchangeRate?: {
    currencyPair: { base: string; counter: string };
    timestamp: string;
    bid: string;
    ask: string;
  };
  fees?: Array<{
    type: string;
    quote: { sourceAmount: Money; targetAmount: Money };
  }>;
  deliveryInfo?: { estimatedDeliveryDate: string };
  hash: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
    hasMore: boolean;
  };
}
