import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  // Wipe smoke-test data (cascades: payments, transactions, history, items)
  await db.order.deleteMany({});
  await db.customer.deleteMany({});
  await db.product.deleteMany({});
  await db.emailLog.deleteMany({});
  // Revert test payment config (owner enters her real Till/Paybill herself)
  const settings = await db.storeSettings.findFirst();
  if (settings) {
    await db.storeSettings.update({ where: { id: settings.id }, data: { payments: {
      payOnDeliveryEnabled: true,
      mpesa: { enabled: false, businessName: "", tillEnabled: false, tillNumber: "", paybillEnabled: false, paybillNumber: "", accountNumber: "", instructions: "" }
    } } });
    // Revert test delivery zones (owner configures real zones/fees)
    const delivery = (settings.delivery as Record<string, unknown>) ?? {};
    await db.storeSettings.update({ where: { id: settings.id }, data: { delivery: { ...delivery, zones: [] } } });
  }
  // Force secure onboarding for the owner
  await db.adminUser.updateMany({ data: { mustChangePassword: true } });
  // Report what remains
  const [products, orders, customers, categories, emails, payments, admins] = await Promise.all([
    db.product.count(), db.order.count(), db.customer.count(), db.category.findMany({ select: { name: true } }),
    db.emailLog.count(), db.payment.count(), db.adminUser.findMany({ select: { email: true, mustChangePassword: true } }),
  ]);
  const s = await db.storeSettings.findFirst();
  console.log(JSON.stringify({
    products, orders, customers, emails, payments,
    categories: categories.map(c => c.name),
    admins,
    keptProfile: s ? { name: s.name, whatsapp: s.whatsappNumber, phone: s.phoneNumber, email: s.email, location: s.location } : null,
    payments: s?.payments, zones: (s?.delivery as any)?.zones,
  }, null, 1));
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
