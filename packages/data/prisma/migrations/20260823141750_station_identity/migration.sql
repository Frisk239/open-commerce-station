-- CreateTable
CREATE TABLE "Station" (
    "flavor" VARCHAR(16) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "logoUrl" VARCHAR(512),
    "faviconUrl" VARCHAR(512),
    "contactEmail" VARCHAR(320),
    "footerLine" VARCHAR(240),
    "icp" VARCHAR(120),
    "policeRecord" VARCHAR(120),
    "policeBadgeUrl" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("flavor")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "Owner"("email");
