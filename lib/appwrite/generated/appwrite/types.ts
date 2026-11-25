import { type Models } from 'node-appwrite';

export const SettingsTaxMode = {
    REGULAR: "regular",
    COMPOSITION: "composition",
    UNREGISTERED: "unregistered"
} as const;

export type SettingsTaxMode = (typeof SettingsTaxMode)[keyof typeof SettingsTaxMode];

export const MenuItemsDiet = {
    VEG: "veg",
    NONVEG: "nonveg",
    EGG: "egg"
} as const;

export type MenuItemsDiet = (typeof MenuItemsDiet)[keyof typeof MenuItemsDiet];

export const InvoicesOrderType = {
    DINE_IN: "dine_in",
    TAKEAWAY: "takeaway",
    DELIVERY: "delivery"
} as const;

export type InvoicesOrderType = (typeof InvoicesOrderType)[keyof typeof InvoicesOrderType];

export const InvoicesPaymentMode = {
    CASH: "cash",
    UPI: "upi",
    CARD: "card",
    OTHER: "other",
    MIXED: "mixed"
} as const;

export type InvoicesPaymentMode = (typeof InvoicesPaymentMode)[keyof typeof InvoicesPaymentMode];

export const InvoicesDiscountType = {
    PERCENT: "percent",
    FLAT: "flat"
} as const;

export type InvoicesDiscountType = (typeof InvoicesDiscountType)[keyof typeof InvoicesDiscountType];

export const InvoicesTaxMode = {
    REGULAR: "regular",
    COMPOSITION: "composition",
    UNREGISTERED: "unregistered"
} as const;

export type InvoicesTaxMode = (typeof InvoicesTaxMode)[keyof typeof InvoicesTaxMode];

export const InvoicesStatus = {
    DUE: "due",
    PAID: "paid"
} as const;

export type InvoicesStatus = (typeof InvoicesStatus)[keyof typeof InvoicesStatus];

export const InvoiceHistoryType = {
    LAYOUT: "layout",
    ITEMS: "items",
    STATUS: "status"
} as const;

export type InvoiceHistoryType = (typeof InvoiceHistoryType)[keyof typeof InvoiceHistoryType];
export type SettingsCreate = {
    "ownerId": string;
    "cafeName": string;
    "legalName"?: string;
    "address"?: string;
    "city"?: string;
    "pincode"?: string;
    "stateCode"?: string;
    "phone"?: string;
    "email"?: string;
    "gstin"?: string;
    "fssai"?: string;
    "taxMode"?: SettingsTaxMode;
    "gstRate"?: number;
    "pricesIncludeTax"?: boolean;
    "invoicePrefix"?: string;
    "upiId"?: string;
    "footerNote"?: string;
    "defaultTemplate"?: string;
    "accentColor"?: string;
    "logo"?: string;
}

export type Settings = Models.Row & {
    "ownerId": string;
    "cafeName": string;
    "legalName"?: string;
    "address"?: string;
    "city"?: string;
    "pincode"?: string;
    "stateCode"?: string;
    "phone"?: string;
    "email"?: string;
    "gstin"?: string;
    "fssai"?: string;
    "taxMode"?: SettingsTaxMode;
    "gstRate"?: number;
    "pricesIncludeTax"?: boolean;
    "invoicePrefix"?: string;
    "upiId"?: string;
    "footerNote"?: string;
    "defaultTemplate"?: string;
    "accentColor"?: string;
    "logo"?: string;
}

export type MenuCategoriesCreate = {
    "ownerId": string;
    "name": string;
    "sortOrder"?: number;
}

export type MenuCategories = Models.Row & {
    "ownerId": string;
    "name": string;
    "sortOrder"?: number;
}

export type MenuItemsCreate = {
    "ownerId": string;
    "categoryId": string;
    "name": string;
    "description"?: string;
    "price"?: number;
    "diet"?: MenuItemsDiet;
    "available"?: boolean;
    "variants"?: string;
    "addons"?: string;
    "sortOrder"?: number;
    "photo"?: string;
}

export type MenuItems = Models.Row & {
    "ownerId": string;
    "categoryId": string;
    "name": string;
    "description"?: string;
    "price"?: number;
    "diet"?: MenuItemsDiet;
    "available"?: boolean;
    "variants"?: string;
    "addons"?: string;
    "sortOrder"?: number;
    "photo"?: string;
}

export type InvoicesCreate = {
    "ownerId": string;
    "number": string;
    "fy": string;
    "seq": number;
    "issuedAt": string;
    "customerName"?: string;
    "customerPhone"?: string;
    "customerGstin"?: string;
    "customerAddress"?: string;
    "orderType"?: InvoicesOrderType;
    "tableNo"?: string;
    "paymentMode"?: InvoicesPaymentMode;
    "paymentSplit"?: string;
    "templateId"?: string;
    "lines"?: string;
    "discountType"?: InvoicesDiscountType;
    "discountValue"?: number;
    "subtotal"?: number;
    "discount"?: number;
    "taxable"?: number;
    "cgst"?: number;
    "sgst"?: number;
    "roundOff"?: number;
    "total"?: number;
    "taxMode"?: InvoicesTaxMode;
    "gstRate"?: number;
    "business"?: string;
    "notes"?: string;
    "status"?: InvoicesStatus;
    "paidAt"?: string;
    "pricesIncludeTax"?: boolean;
}

export type Invoices = Models.Row & {
    "ownerId": string;
    "number": string;
    "fy": string;
    "seq": number;
    "issuedAt": string;
    "customerName"?: string;
    "customerPhone"?: string;
    "customerGstin"?: string;
    "customerAddress"?: string;
    "orderType"?: InvoicesOrderType;
    "tableNo"?: string;
    "paymentMode"?: InvoicesPaymentMode;
    "paymentSplit"?: string;
    "templateId"?: string;
    "lines"?: string;
    "discountType"?: InvoicesDiscountType;
    "discountValue"?: number;
    "subtotal"?: number;
    "discount"?: number;
    "taxable"?: number;
    "cgst"?: number;
    "sgst"?: number;
    "roundOff"?: number;
    "total"?: number;
    "taxMode"?: InvoicesTaxMode;
    "gstRate"?: number;
    "business"?: string;
    "notes"?: string;
    "status"?: InvoicesStatus;
    "paidAt"?: string;
    "pricesIncludeTax"?: boolean;
}

export type InvoiceHistoryCreate = {
    "ownerId": string;
    "invoiceId": string;
    "type"?: InvoiceHistoryType;
    "from"?: string;
    "to"?: string;
    "at": string;
    "detail"?: string;
}

export type InvoiceHistory = Models.Row & {
    "ownerId": string;
    "invoiceId": string;
    "type"?: InvoiceHistoryType;
    "from"?: string;
    "to"?: string;
    "at": string;
    "detail"?: string;
}

export type ExpensesCreate = {
    "ownerId": string;
    "day": string;
    "description": string;
    "amount": number;
    "at": string;
}

export type Expenses = Models.Row & {
    "ownerId": string;
    "day": string;
    "description": string;
    "amount": number;
    "at": string;
}

export type DayTotalsCreate = {
    "ownerId": string;
    "day": string;
    "totals"?: string;
    "items"?: string;
}

export type DayTotals = Models.Row & {
    "ownerId": string;
    "day": string;
    "totals"?: string;
    "items"?: string;
}

declare const __roleStringBrand: unique symbol;
export type RoleString = string & { readonly [__roleStringBrand]: never };

export type RoleBuilder = {
  any: () => RoleString;
  user: (userId: string, status?: string) => RoleString;
  users: (status?: string) => RoleString;
  guests: () => RoleString;
  team: (teamId: string, role?: string) => RoleString;
  member: (memberId: string) => RoleString;
  label: (label: string) => RoleString;
}

export type PermissionBuilder = {
  read: (role: RoleString) => string;
  write: (role: RoleString) => string;
  create: (role: RoleString) => string;
  update: (role: RoleString) => string;
  delete: (role: RoleString) => string;
}

export type PermissionCallback = (permission: PermissionBuilder, role: RoleBuilder) => string[];

export type QueryValue = string | number | boolean;

export type ExtractQueryValue<T> = T extends (infer U)[]
  ? U extends QueryValue ? U : never
  : T extends QueryValue | null ? NonNullable<T> : never;

export type QueryableKeys<T> = {
  [K in keyof T]: ExtractQueryValue<T[K]> extends never ? never : K;
}[keyof T];

export type QueryableFieldValue<T, K> = K extends keyof T
  ? ExtractQueryValue<T[K]>
  : never;

export type QueryBuilder<T> = {
  equal: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  notEqual: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  lessThan: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  lessThanEqual: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  greaterThan: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  greaterThanEqual: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  contains: <K extends QueryableKeys<T>>(field: K, value: QueryableFieldValue<T, K>) => string;
  search: <K extends QueryableKeys<T>>(field: K, value: string) => string;
  isNull: <K extends QueryableKeys<T>>(field: K) => string;
  isNotNull: <K extends QueryableKeys<T>>(field: K) => string;
  startsWith: <K extends QueryableKeys<T>>(field: K, value: string) => string;
  endsWith: <K extends QueryableKeys<T>>(field: K, value: string) => string;
  between: <K extends QueryableKeys<T>>(field: K, start: QueryableFieldValue<T, K>, end: QueryableFieldValue<T, K>) => string;
  select: <K extends keyof T>(fields: K[]) => string;
  orderAsc: <K extends keyof T>(field: K) => string;
  orderDesc: <K extends keyof T>(field: K) => string;
  limit: (value: number) => string;
  offset: (value: number) => string;
  cursorAfter: (documentId: string) => string;
  cursorBefore: (documentId: string) => string;
  or: (...queries: string[]) => string;
  and: (...queries: string[]) => string;
  count: (attribute?: string, alias?: string) => string;
  countDistinct: (attribute: string, alias?: string) => string;
  sum: (attribute: string, alias?: string) => string;
  avg: (attribute: string, alias?: string) => string;
  min: (attribute: string, alias?: string) => string;
  max: (attribute: string, alias?: string) => string;
  stddev: (attribute: string, alias?: string) => string;
  stddevPop: (attribute: string, alias?: string) => string;
  stddevSamp: (attribute: string, alias?: string) => string;
  variance: (attribute: string, alias?: string) => string;
  varPop: (attribute: string, alias?: string) => string;
  varSamp: (attribute: string, alias?: string) => string;
  bitAnd: (attribute: string, alias?: string) => string;
  bitOr: (attribute: string, alias?: string) => string;
  bitXor: (attribute: string, alias?: string) => string;
  groupBy: (attributes: string[]) => string;
  having: (queries: string[]) => string;
  distinct: () => string;
  on: (left: string, right: string, operator?: string) => string;
  join: (table: string, leftOrAliasOrOn: string | string[], rightOrOn?: string | string[], operator?: string, alias?: string) => string;
  leftJoin: (table: string, leftOrAliasOrOn: string | string[], rightOrOn?: string | string[], operator?: string, alias?: string) => string;
  rightJoin: (table: string, leftOrAliasOrOn: string | string[], rightOrOn?: string | string[], operator?: string, alias?: string) => string;
  fullOuterJoin: (table: string, leftOrAliasOrOn: string | string[], rightOrOn?: string | string[], operator?: string, alias?: string) => string;
  crossJoin: (table: string, alias?: string) => string;
  vectorDot: (attribute: string, vector: number[]) => string;
  vectorCosine: (attribute: string, vector: number[]) => string;
  vectorEuclidean: (attribute: string, vector: number[]) => string;
  covers: (attribute: string, values: any[]) => string;
  notCovers: (attribute: string, values: any[]) => string;
  spatialEquals: (attribute: string, values: any[]) => string;
  notSpatialEquals: (attribute: string, values: any[]) => string;
}

export type DatabaseId = "cafe";

export type DatabaseTableMap = {
  "cafe": {
    "Settings": {
      create: (data: {
        "ownerId": string;
        "cafeName": string;
        "legalName"?: string;
        "address"?: string;
        "city"?: string;
        "pincode"?: string;
        "stateCode"?: string;
        "phone"?: string;
        "email"?: string;
        "gstin"?: string;
        "fssai"?: string;
        "taxMode"?: SettingsTaxMode;
        "gstRate"?: number;
        "pricesIncludeTax"?: boolean;
        "invoicePrefix"?: string;
        "upiId"?: string;
        "footerNote"?: string;
        "defaultTemplate"?: string;
        "accentColor"?: string;
        "logo"?: string;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Settings>;
      get: (id: string) => Promise<Settings>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "cafeName": string;
        "legalName"?: string;
        "address"?: string;
        "city"?: string;
        "pincode"?: string;
        "stateCode"?: string;
        "phone"?: string;
        "email"?: string;
        "gstin"?: string;
        "fssai"?: string;
        "taxMode"?: SettingsTaxMode;
        "gstRate"?: number;
        "pricesIncludeTax"?: boolean;
        "invoicePrefix"?: string;
        "upiId"?: string;
        "footerNote"?: string;
        "defaultTemplate"?: string;
        "accentColor"?: string;
        "logo"?: string;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Settings>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<Settings>) => string[] }) => Promise<{ total: number; rows: Settings[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "cafeName": string;
        "legalName"?: string;
        "address"?: string;
        "city"?: string;
        "pincode"?: string;
        "stateCode"?: string;
        "phone"?: string;
        "email"?: string;
        "gstin"?: string;
        "fssai"?: string;
        "taxMode"?: SettingsTaxMode;
        "gstRate"?: number;
        "pricesIncludeTax"?: boolean;
        "invoicePrefix"?: string;
        "upiId"?: string;
        "footerNote"?: string;
        "defaultTemplate"?: string;
        "accentColor"?: string;
        "logo"?: string;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: Settings[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "cafeName": string;
        "legalName"?: string;
        "address"?: string;
        "city"?: string;
        "pincode"?: string;
        "stateCode"?: string;
        "phone"?: string;
        "email"?: string;
        "gstin"?: string;
        "fssai"?: string;
        "taxMode"?: SettingsTaxMode;
        "gstRate"?: number;
        "pricesIncludeTax"?: boolean;
        "invoicePrefix"?: string;
        "upiId"?: string;
        "footerNote"?: string;
        "defaultTemplate"?: string;
        "accentColor"?: string;
        "logo"?: string;
      }>, options?: { queries?: (q: QueryBuilder<Settings>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Settings[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<Settings>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Settings[] }>;
    };
    "Menu categories": {
      create: (data: {
        "ownerId": string;
        "name": string;
        "sortOrder"?: number;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<MenuCategories>;
      get: (id: string) => Promise<MenuCategories>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "name": string;
        "sortOrder"?: number;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<MenuCategories>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<MenuCategories>) => string[] }) => Promise<{ total: number; rows: MenuCategories[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "name": string;
        "sortOrder"?: number;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: MenuCategories[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "name": string;
        "sortOrder"?: number;
      }>, options?: { queries?: (q: QueryBuilder<MenuCategories>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: MenuCategories[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<MenuCategories>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: MenuCategories[] }>;
    };
    "Menu items": {
      create: (data: {
        "ownerId": string;
        "categoryId": string;
        "name": string;
        "description"?: string;
        "price"?: number;
        "diet"?: MenuItemsDiet;
        "available"?: boolean;
        "variants"?: string;
        "addons"?: string;
        "sortOrder"?: number;
        "photo"?: string;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<MenuItems>;
      get: (id: string) => Promise<MenuItems>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "categoryId": string;
        "name": string;
        "description"?: string;
        "price"?: number;
        "diet"?: MenuItemsDiet;
        "available"?: boolean;
        "variants"?: string;
        "addons"?: string;
        "sortOrder"?: number;
        "photo"?: string;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<MenuItems>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<MenuItems>) => string[] }) => Promise<{ total: number; rows: MenuItems[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "categoryId": string;
        "name": string;
        "description"?: string;
        "price"?: number;
        "diet"?: MenuItemsDiet;
        "available"?: boolean;
        "variants"?: string;
        "addons"?: string;
        "sortOrder"?: number;
        "photo"?: string;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: MenuItems[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "categoryId": string;
        "name": string;
        "description"?: string;
        "price"?: number;
        "diet"?: MenuItemsDiet;
        "available"?: boolean;
        "variants"?: string;
        "addons"?: string;
        "sortOrder"?: number;
        "photo"?: string;
      }>, options?: { queries?: (q: QueryBuilder<MenuItems>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: MenuItems[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<MenuItems>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: MenuItems[] }>;
    };
    "Invoices": {
      create: (data: {
        "ownerId": string;
        "number": string;
        "fy": string;
        "seq": number;
        "issuedAt": string;
        "customerName"?: string;
        "customerPhone"?: string;
        "customerGstin"?: string;
        "customerAddress"?: string;
        "orderType"?: InvoicesOrderType;
        "tableNo"?: string;
        "paymentMode"?: InvoicesPaymentMode;
        "paymentSplit"?: string;
        "templateId"?: string;
        "lines"?: string;
        "discountType"?: InvoicesDiscountType;
        "discountValue"?: number;
        "subtotal"?: number;
        "discount"?: number;
        "taxable"?: number;
        "cgst"?: number;
        "sgst"?: number;
        "roundOff"?: number;
        "total"?: number;
        "taxMode"?: InvoicesTaxMode;
        "gstRate"?: number;
        "business"?: string;
        "notes"?: string;
        "status"?: InvoicesStatus;
        "paidAt"?: string;
        "pricesIncludeTax"?: boolean;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Invoices>;
      get: (id: string) => Promise<Invoices>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "number": string;
        "fy": string;
        "seq": number;
        "issuedAt": string;
        "customerName"?: string;
        "customerPhone"?: string;
        "customerGstin"?: string;
        "customerAddress"?: string;
        "orderType"?: InvoicesOrderType;
        "tableNo"?: string;
        "paymentMode"?: InvoicesPaymentMode;
        "paymentSplit"?: string;
        "templateId"?: string;
        "lines"?: string;
        "discountType"?: InvoicesDiscountType;
        "discountValue"?: number;
        "subtotal"?: number;
        "discount"?: number;
        "taxable"?: number;
        "cgst"?: number;
        "sgst"?: number;
        "roundOff"?: number;
        "total"?: number;
        "taxMode"?: InvoicesTaxMode;
        "gstRate"?: number;
        "business"?: string;
        "notes"?: string;
        "status"?: InvoicesStatus;
        "paidAt"?: string;
        "pricesIncludeTax"?: boolean;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Invoices>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<Invoices>) => string[] }) => Promise<{ total: number; rows: Invoices[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "number": string;
        "fy": string;
        "seq": number;
        "issuedAt": string;
        "customerName"?: string;
        "customerPhone"?: string;
        "customerGstin"?: string;
        "customerAddress"?: string;
        "orderType"?: InvoicesOrderType;
        "tableNo"?: string;
        "paymentMode"?: InvoicesPaymentMode;
        "paymentSplit"?: string;
        "templateId"?: string;
        "lines"?: string;
        "discountType"?: InvoicesDiscountType;
        "discountValue"?: number;
        "subtotal"?: number;
        "discount"?: number;
        "taxable"?: number;
        "cgst"?: number;
        "sgst"?: number;
        "roundOff"?: number;
        "total"?: number;
        "taxMode"?: InvoicesTaxMode;
        "gstRate"?: number;
        "business"?: string;
        "notes"?: string;
        "status"?: InvoicesStatus;
        "paidAt"?: string;
        "pricesIncludeTax"?: boolean;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: Invoices[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "number": string;
        "fy": string;
        "seq": number;
        "issuedAt": string;
        "customerName"?: string;
        "customerPhone"?: string;
        "customerGstin"?: string;
        "customerAddress"?: string;
        "orderType"?: InvoicesOrderType;
        "tableNo"?: string;
        "paymentMode"?: InvoicesPaymentMode;
        "paymentSplit"?: string;
        "templateId"?: string;
        "lines"?: string;
        "discountType"?: InvoicesDiscountType;
        "discountValue"?: number;
        "subtotal"?: number;
        "discount"?: number;
        "taxable"?: number;
        "cgst"?: number;
        "sgst"?: number;
        "roundOff"?: number;
        "total"?: number;
        "taxMode"?: InvoicesTaxMode;
        "gstRate"?: number;
        "business"?: string;
        "notes"?: string;
        "status"?: InvoicesStatus;
        "paidAt"?: string;
        "pricesIncludeTax"?: boolean;
      }>, options?: { queries?: (q: QueryBuilder<Invoices>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Invoices[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<Invoices>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Invoices[] }>;
    };
    "Invoice history": {
      create: (data: {
        "ownerId": string;
        "invoiceId": string;
        "type"?: InvoiceHistoryType;
        "from"?: string;
        "to"?: string;
        "at": string;
        "detail"?: string;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<InvoiceHistory>;
      get: (id: string) => Promise<InvoiceHistory>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "invoiceId": string;
        "type"?: InvoiceHistoryType;
        "from"?: string;
        "to"?: string;
        "at": string;
        "detail"?: string;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<InvoiceHistory>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<InvoiceHistory>) => string[] }) => Promise<{ total: number; rows: InvoiceHistory[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "invoiceId": string;
        "type"?: InvoiceHistoryType;
        "from"?: string;
        "to"?: string;
        "at": string;
        "detail"?: string;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: InvoiceHistory[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "invoiceId": string;
        "type"?: InvoiceHistoryType;
        "from"?: string;
        "to"?: string;
        "at": string;
        "detail"?: string;
      }>, options?: { queries?: (q: QueryBuilder<InvoiceHistory>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: InvoiceHistory[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<InvoiceHistory>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: InvoiceHistory[] }>;
    };
    "Expenses": {
      create: (data: {
        "ownerId": string;
        "day": string;
        "description": string;
        "amount": number;
        "at": string;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Expenses>;
      get: (id: string) => Promise<Expenses>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "day": string;
        "description": string;
        "amount": number;
        "at": string;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<Expenses>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<Expenses>) => string[] }) => Promise<{ total: number; rows: Expenses[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "day": string;
        "description": string;
        "amount": number;
        "at": string;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: Expenses[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "day": string;
        "description": string;
        "amount": number;
        "at": string;
      }>, options?: { queries?: (q: QueryBuilder<Expenses>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Expenses[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<Expenses>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: Expenses[] }>;
    };
    "Day totals": {
      create: (data: {
        "ownerId": string;
        "day": string;
        "totals"?: string;
        "items"?: string;
      }, options?: { rowId?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<DayTotals>;
      get: (id: string) => Promise<DayTotals>;
      update: (id: string, data: Partial<{
        "ownerId": string;
        "day": string;
        "totals"?: string;
        "items"?: string;
      }>, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; transactionId?: string }) => Promise<DayTotals>;
      delete: (id: string, options?: { transactionId?: string }) => Promise<void>;
      list: (options?: { queries?: (q: QueryBuilder<DayTotals>) => string[] }) => Promise<{ total: number; rows: DayTotals[] }>;
      createMany: (rows: Array<{
        "ownerId": string;
        "day": string;
        "totals"?: string;
        "items"?: string;
      } & { $id?: string; $permissions?: string[] }>, options?: { transactionId?: string }) => Promise<{ total: number; rows: DayTotals[] }>;
      updateMany: (data: Partial<{
        "ownerId": string;
        "day": string;
        "totals"?: string;
        "items"?: string;
      }>, options?: { queries?: (q: QueryBuilder<DayTotals>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: DayTotals[] }>;
      deleteMany: (options?: { queries?: (q: QueryBuilder<DayTotals>) => string[]; transactionId?: string }) => Promise<{ total: number; rows: DayTotals[] }>;
    }
  }
};

export type DatabaseHandle<D extends DatabaseId> = {
  use: <T extends keyof DatabaseTableMap[D] & string>(tableId: T) => DatabaseTableMap[D][T];
  create: (tableId: string, name: string, options?: { permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; rowSecurity?: boolean; enabled?: boolean; columns?: object[]; indexes?: object[] }) => Promise<Models.Table>;
  update: <T extends keyof DatabaseTableMap[D] & string>(tableId: T, options?: { name?: string; permissions?: (permission: { read: (role: RoleString) => string; write: (role: RoleString) => string; create: (role: RoleString) => string; update: (role: RoleString) => string; delete: (role: RoleString) => string }, role: { any: () => RoleString; user: (userId: string, status?: string) => RoleString; users: (status?: string) => RoleString; guests: () => RoleString; team: (teamId: string, role?: string) => RoleString; member: (memberId: string) => RoleString; label: (label: string) => RoleString }) => string[]; rowSecurity?: boolean; enabled?: boolean }) => Promise<Models.Table>;
  delete: <T extends keyof DatabaseTableMap[D] & string>(tableId: T) => Promise<void>;
};

export type DatabaseTables = {
  use: <D extends DatabaseId>(databaseId: D) => DatabaseHandle<D>;
  create: (databaseId: string, name: string, options?: { enabled?: boolean }) => Promise<Models.Database>;
  update: <D extends DatabaseId>(databaseId: D, options?: { name?: string; enabled?: boolean }) => Promise<Models.Database>;
  delete: <D extends DatabaseId>(databaseId: D) => Promise<void>;
};
