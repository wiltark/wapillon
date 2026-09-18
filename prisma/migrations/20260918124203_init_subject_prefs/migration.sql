-- CreateTable
CREATE TABLE "SubjectPref" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "color" TEXT,
    "image" TEXT,
    "alias" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SubjectPref_accountId_idx" ON "SubjectPref"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectPref_accountId_subject_key" ON "SubjectPref"("accountId", "subject");
