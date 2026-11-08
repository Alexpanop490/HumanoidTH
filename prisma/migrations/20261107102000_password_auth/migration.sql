DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

ALTER TABLE "User"
DROP COLUMN IF EXISTS "emailVerified",
DROP COLUMN IF EXISTS "image",
ADD COLUMN "passwordHash" TEXT;

UPDATE "User" SET "role" = 'USER' WHERE "role" <> 'USER';
