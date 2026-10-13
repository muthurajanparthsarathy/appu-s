-- One account per mobile number, so customers can sign in with their mobile.
-- Fails if two users already share a phone (checked before deploying: none do).
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
