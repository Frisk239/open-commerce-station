-- The Shopper states a reason when opening the request; the Merchant may
-- record a decision note (PRD user stories 106/109/110).
ALTER TABLE "ReturnRequest" ADD COLUMN "reason" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "ReturnRequest" ADD COLUMN "note" VARCHAR(500);
