import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const [products, orders, customers, categories, admins, emails, payments] = await Promise.all([
    db.product.count(), db.order.count(), db.customer.count(), db.category.count(),
    db.adminUser.findMany({ select: { email: true, mustChangePassword: true } }),
    db.emailLog.count(), db.payment.count(),
  ]);
  console.log(JSON.stringify({ products, orders, customers, categories, admins, emails, payments }));
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
