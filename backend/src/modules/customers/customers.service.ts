import { prisma } from "../../lib/prisma";
import { mapCustomerDetail, mapCustomerSummary } from "../../lib/mappers";
import { ApiError } from "../../lib/errors";
import type { CustomerDetail, CustomerSummary } from "../../shared/api-types";

/**
 * Customers are created/updated automatically from orders (upsert by
 * normalised phone) — see orders.service.ts. Aggregates (ordersCount,
 * totalSpent, locations) are computed from the customer's real orders.
 * Customers whose only orders were cancelled are excluded, mirroring Phase 1.
 */

export async function listCustomers(): Promise<CustomerSummary[]> {
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        where: { status: { not: "cancelled" } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return customers
    .filter((c) => c.orders.length > 0)
    .map(mapCustomerSummary)
    .sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          statusHistory: true,
          payments: { include: { transactions: true } },
        },
      },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found.", "NOT_FOUND");
  return mapCustomerDetail(customer);
}
