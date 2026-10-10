import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const erpDriveSettings=sqliteTable('erp_drive_settings',{id:text('id').primaryKey(),rootId:text('root_id').notNull(),driveId:text('drive_id').notNull(),email:text('email').notNull(),credential:text('credential').notNull()});
export const erpDriveFolders=sqliteTable('erp_drive_folders',{key:text('key').primaryKey(),folderId:text('folder_id'),leaseUntil:integer('lease_until').notNull().default(0)});
export const erpDriveOAuth=sqliteTable('erp_drive_oauth',{id:text('id').primaryKey(),credential:text('credential').notNull()});
export const erpDriveStates=sqliteTable('erp_drive_states',{hash:text('hash').primaryKey(),sessionHash:text('session_hash').notNull(),credential:text('credential').notNull(),verifier:text('verifier').notNull(),expiresAt:integer('expires_at').notNull()});
export const erpCollections = sqliteTable('erp_collections', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  revision: integer('revision').notNull().default(0),
});
export const erpSessions = sqliteTable('erp_sessions', {
 tokenHash:text('token_hash').primaryKey(),employeeId:text('employee_id').notNull(),
 platformEmail:text('platform_email').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const erpCleanupBackup = sqliteTable('erp_cleanup_backup', {
 key:text('key').primaryKey(),value:text('value').notNull(),revision:integer('revision').notNull(),
});
export const erpMailSettings=sqliteTable('erp_mail_settings',{id:text('id').primaryKey(),sender:text('sender').notNull(),password:text('password').notNull()});
export const erpMailOutbox=sqliteTable('erp_mail_outbox',{
 id:text('id').primaryKey(),recipientId:text('recipient_id').notNull(),recipientEmail:text('recipient_email').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),
 status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),leaseUntil:integer('lease_until').notNull().default(0),nextAttemptAt:integer('next_attempt_at').notNull().default(0),createdAt:integer('created_at').notNull(),sentAt:integer('sent_at'),error:text('error').notNull().default(''),
});
