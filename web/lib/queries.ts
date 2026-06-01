"use client";

// Named query builders per view. Keeping SQL here (not inline in components)
// makes the data contract explicit and the views declarative.

import { parquet, parquetUnion, sqlLit } from "./duckdb";

const MONTH = () => parquet("summary/spend_by_month.parquet");
const SUPPLIER = () => parquet("summary/spend_by_supplier.parquet");
const DEPT = () => parquet("summary/spend_by_department.parquet");

export interface MonthRow {
  council: string;
  year_month: string;
  total: number;
  txn_count: number;
}

export function monthlySpendSql(): string {
  return `SELECT council, year_month, total, txn_count
          FROM ${MONTH()} WHERE year_month IS NOT NULL
          ORDER BY year_month, council`;
}

export interface SupplierRow {
  council: string;
  supplier_id_canonical: string;
  supplier_name_norm: string;
  total: number;
  txn_count: number;
}

export function topSuppliersSql(limit = 15, council?: string): string {
  const where = council ? `WHERE council = ${sqlLit(council)}` : "";
  return `SELECT supplier_id_canonical, any_value(supplier_name_norm) AS supplier_name_norm,
                 sum(total) AS total, sum(txn_count) AS txn_count
          FROM ${SUPPLIER()} ${where}
          GROUP BY supplier_id_canonical
          ORDER BY total DESC LIMIT ${limit}`;
}

export function searchSuppliersSql(term: string, limit = 50): string {
  const t = sqlLit(`%${term.toLowerCase()}%`);
  return `SELECT supplier_id_canonical, any_value(supplier_name_norm) AS supplier_name_norm,
                 sum(total) AS total, sum(txn_count) AS txn_count
          FROM ${SUPPLIER()}
          WHERE lower(supplier_name_norm) LIKE ${t}
          GROUP BY supplier_id_canonical
          ORDER BY total DESC LIMIT ${limit}`;
}

export interface DeptRow {
  council: string;
  expense_area: string;
  total: number;
  txn_count: number;
}

export function topDepartmentsSql(limit = 12): string {
  return `SELECT expense_area, sum(total) AS total, sum(txn_count) AS txn_count
          FROM ${DEPT()} WHERE expense_area IS NOT NULL
          GROUP BY expense_area ORDER BY total DESC LIMIT ${limit}`;
}

// ---- Transaction-level (reads selected partition Parquet) ----

export interface TxnRow {
  payment_date: string;
  council: string;
  supplier_name_raw: string;
  expense_area: string;
  expense_type: string;
  amount: number;
  is_redacted: boolean;
}

export function transactionsSql(
  partitionPaths: string[],
  opts: { supplier?: string; minAmount?: number; limit?: number },
): string {
  if (partitionPaths.length === 0) return "SELECT NULL WHERE FALSE";
  const conds: string[] = ["amount IS NOT NULL"];
  if (opts.supplier)
    conds.push(`lower(supplier_name_norm) LIKE ${sqlLit(`%${opts.supplier.toLowerCase()}%`)}`);
  if (opts.minAmount != null) conds.push(`amount >= ${opts.minAmount}`);
  return `SELECT CAST(payment_date AS VARCHAR) AS payment_date, council,
                 supplier_name_raw, expense_area, expense_type, amount, is_redacted
          FROM ${parquetUnion(partitionPaths)}
          WHERE ${conds.join(" AND ")}
          ORDER BY amount DESC
          LIMIT ${opts.limit ?? 200}`;
}

export function supplierDetailSql(partitionPaths: string[], supplierId: string): string {
  if (partitionPaths.length === 0) return "SELECT NULL WHERE FALSE";
  return `SELECT CAST(payment_date AS VARCHAR) AS payment_date, council,
                 supplier_name_raw, expense_area, expense_type, amount
          FROM ${parquetUnion(partitionPaths)}
          WHERE supplier_id_canonical = ${sqlLit(supplierId)}
          ORDER BY payment_date DESC LIMIT 500`;
}
