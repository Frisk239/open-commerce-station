-- MailConfig is independent of the Station identity row so mail settings
-- can be saved before the merchant completes Store identity.
ALTER TABLE "MailConfig" DROP CONSTRAINT IF EXISTS "MailConfig_flavor_fkey";
