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

// ---- Grants ----

export interface GrantYearRow {
  council: string;
  financial_year: number;
  total: number;
  grant_count: number;
}

export function grantsByYearSql(): string {
  return `SELECT council, financial_year, total, grant_count
          FROM ${parquet("summary/grants_by_year.parquet")}
          WHERE financial_year IS NOT NULL
          ORDER BY financial_year, council`;
}

export interface GrantRow {
  award_date: string;
  council: string;
  recipient_name_raw: string;
  grant_programme: string;
  purpose: string;
  amount: number;
}

export function grantsSql(opts: { recipient?: string; council?: string; limit?: number }): string {
  const conds = ["amount IS NOT NULL"];
  if (opts.recipient)
    conds.push(`lower(recipient_name_norm) LIKE ${sqlLit(`%${opts.recipient.toLowerCase()}%`)}`);
  if (opts.council) conds.push(`council = ${sqlLit(opts.council)}`);
  return `SELECT CAST(award_date AS VARCHAR) AS award_date, council, recipient_name_raw,
                 grant_programme, purpose, amount
          FROM ${parquet("grants/grants.parquet")}
          WHERE ${conds.join(" AND ")}
          ORDER BY amount DESC LIMIT ${opts.limit ?? 200}`;
}

// ---- Contracts ----

export interface ContractRow {
  council: string;
  title: string;
  supplier_name_raw: string;
  category: string;
  value: number;
  start_date: string;
  end_date: string;
}

// ---- Analysis (classified categories + concentration) ----

const CATEGORY = () => parquet("summary/spend_by_category.parquet");

export interface CategoryTotalRow {
  council: string;
  spend_category: string;
  total: number;
  txn_count: number;
}

export function categoryTotalsSql(council?: string): string {
  const where = council ? `WHERE council = ${sqlLit(council)}` : "";
  return `SELECT council, spend_category, sum(total) AS total, sum(txn_count) AS txn_count
          FROM ${CATEGORY()} ${where}
          GROUP BY council, spend_category
          ORDER BY total DESC`;
}

export interface CategoryMonthRow {
  council: string;
  spend_category: string;
  year_month: string;
  total: number;
}

/** Monthly spend time-series for the given categories (optionally one council). */
export function categoryTrendSql(categories: string[], council?: string): string {
  const cats = categories.map(sqlLit).join(", ");
  const conds = [`spend_category IN (${cats})`, "year_month IS NOT NULL"];
  if (council) conds.push(`council = ${sqlLit(council)}`);
  return `SELECT council, spend_category, year_month, sum(total) AS total
          FROM ${CATEGORY()}
          WHERE ${conds.join(" AND ")}
          GROUP BY council, spend_category, year_month
          ORDER BY year_month`;
}

export interface ConcentrationRow {
  council: string;
  year: number;
  total: number;
  top10: number;
  n_suppliers: number;
  top10_pct: number;
}

export function concentrationSql(): string {
  return `SELECT council, year, total, top10, n_suppliers, top10_pct
          FROM ${parquet("summary/contractor_concentration.parquet")}
          WHERE year > 0
          ORDER BY council, year`;
}

export function contractsSql(opts: { supplier?: string; limit?: number }): string {
  const conds = ["1=1"];
  if (opts.supplier)
    conds.push(`lower(supplier_name_norm) LIKE ${sqlLit(`%${opts.supplier.toLowerCase()}%`)}`);
  return `SELECT council, title, supplier_name_raw, category, value,
                 CAST(start_date AS VARCHAR) AS start_date,
                 CAST(end_date AS VARCHAR) AS end_date
          FROM ${parquet("contracts/contracts.parquet")}
          WHERE ${conds.join(" AND ")}
          ORDER BY value DESC NULLS LAST LIMIT ${opts.limit ?? 300}`;
}
