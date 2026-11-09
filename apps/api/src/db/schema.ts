import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  index,
  unique,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

// Enums
export const membershipRoleEnum = pgEnum('membership_role', [
  'owner',
  'tracker',
  'viewer',
]);

export const accountTypeEnum = pgEnum('account_type', [
  'cash',
  'bank',
  'mobile_money',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'expense',
  'income',
  'transfer',
  'borrowing',
  'debt_repayment',
]);

export const transactionSourceEnum = pgEnum('transaction_source', [
  'manual',
  'sms_import',
  'bank_import',
]);

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Tenants
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Tenant memberships
export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: membershipRoleEnum('role').default('tracker').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('tenant_memberships_tenant_user_unique')
      .on(table.tenantId, table.userId),
  ],
);

// Accounts
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(),

    type: accountTypeEnum('type').notNull(),

    currency: varchar('currency', { length: 3 })
      .default('KES')
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('accounts_tenant_id_id_unique')
      .on(table.tenantId, table.id),

    uniqueIndex('accounts_tenant_name_unique')
      .on(table.tenantId, table.name),
  ],
);

// Categories
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(),

    parentId: uuid('parent_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('categories_tenant_id_id_unique')
      .on(table.tenantId, table.id),

    uniqueIndex('categories_tenant_name_unique')
      .on(table.tenantId, table.name),

    foreignKey({
      columns: [table.tenantId, table.parentId],
      foreignColumns: [table.tenantId, table.id],
      name: 'categories_parent_tenant_fk',
    }),
  ],
);

// Transactions
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    sourceAccountId: uuid('source_account_id'),
    destinationAccountId: uuid('destination_account_id'),

    categoryId: uuid('category_id'),

    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' }),

    type: transactionTypeEnum('type').notNull(),

    amount: numeric('amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    currency: varchar('currency', { length: 3 })
      .default('KES')
      .notNull(),

    merchant: varchar('merchant', { length: 255 }),

    description: text('description'),

    source: transactionSourceEnum('source')
      .default('manual')
      .notNull(),

    externalReference: varchar('external_reference', {
      length: 100,
    }),

    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('transactions_tenant_occurred_at_idx')
      .on(table.tenantId, table.occurredAt),

    index('transactions_tenant_category_idx')
      .on(table.tenantId, table.categoryId),

    index('transactions_tenant_type_idx')
      .on(table.tenantId, table.type),

    foreignKey({
      columns: [table.tenantId, table.sourceAccountId],
      foreignColumns: [accounts.tenantId, accounts.id],
      name: 'transactions_source_account_tenant_fk',
    }),

    foreignKey({
      columns: [table.tenantId, table.destinationAccountId],
      foreignColumns: [accounts.tenantId, accounts.id],
      name: 'transactions_destination_account_tenant_fk',
    }),

    foreignKey({
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [categories.tenantId, categories.id],
      name: 'transactions_category_tenant_fk',
    }),

    check(
      'transactions_amount_positive',
      sql`${table.amount} > 0`,
    ),
  ],
);