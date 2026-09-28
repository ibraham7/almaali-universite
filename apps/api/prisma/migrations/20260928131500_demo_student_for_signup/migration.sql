-- A clearly marked fictional student for trying the public signup flow.
-- Never changes an identity that has already claimed an account.
INSERT INTO "Student" (
  "id", "universityId", "firstName", "fullName", "middleName", "familyName",
  "motherName", "nationalId", "applicationNumber", "birthPlace",
  "status", "createdAt", "updatedAt"
) VALUES (
  '66e88a89-8af0-4bd9-a129-d6c3c91a0041',
  'TEST-U-001', 'ليان', 'ليان خالد العبدالله', 'خالد', 'العبدالله',
  'منى', 'TEST-NID-001', 'TEST-APP-101', 'حلب',
  'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("universityId") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "middleName" = EXCLUDED."middleName",
  "motherName" = EXCLUDED."motherName",
  "nationalId" = EXCLUDED."nationalId",
  "applicationNumber" = EXCLUDED."applicationNumber",
  "birthPlace" = EXCLUDED."birthPlace",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "Student"."userId" IS NULL;
