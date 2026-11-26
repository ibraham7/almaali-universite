-- تاريخ عودة الطالب المؤجل (عمود إضافي، بدون تغيير بالبيانات الحالية).
ALTER TABLE "Student" ADD COLUMN "deferredUntil" TIMESTAMP(3);
