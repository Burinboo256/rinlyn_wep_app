# Schema reference

Source of truth: `src/lib/db.ts`. Mirror any change here.

## users
| col | type | notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| username | TEXT UNIQUE | login |
| password_hash | TEXT | bcrypt, 10 rounds |
| full_name | TEXT | display name |
| role | TEXT | `agent` \| `supervisor` (CHECK) |
| supervisor_id | INTEGER FK→users.id | NULL for supervisors; ON DELETE SET NULL |
| created_at | TEXT | `datetime('now')` |

A supervisor's own `supervisor_id` is NULL. Agents belong to exactly one supervisor.

## customers
| col | type | notes |
|---|---|---|
| id | INTEGER PK | |
| agent_id | INTEGER FK→users.id | ON DELETE CASCADE — deleting agent deletes their customers |
| full_name | TEXT NOT NULL | |
| national_id | TEXT | |
| dob | TEXT | ISO date `YYYY-MM-DD` |
| phone, email, address | TEXT | |
| beneficiary | TEXT | ผู้รับผลประโยชน์ |
| note | TEXT | |
| created_at | TEXT | |

## policies
| col | type | notes |
|---|---|---|
| id | INTEGER PK | |
| customer_id | INTEGER FK→customers.id | ON DELETE CASCADE |
| policy_no | TEXT | optional |
| product_name | TEXT NOT NULL | |
| payment_type | TEXT NOT NULL | `รายเดือน`, `ราย 3 เดือน`, `ราย 6 เดือน`, `รายปี`, `ชำระครั้งเดียว` |
| premium | REAL | บาท |
| sum_insured | REAL | บาท |
| start_date | TEXT NOT NULL | ISO `YYYY-MM-DD` — used in date() comparisons |
| end_date | TEXT NOT NULL | ISO `YYYY-MM-DD` — drives expiring queries |
| status | TEXT | `active`, `lapsed`, `cancelled` |
| note | TEXT | |
| created_at | TEXT | |

## Indexes
- `idx_customers_agent` on customers(agent_id)
- `idx_policies_customer` on policies(customer_id)
- `idx_users_supervisor` on users(supervisor_id)

## Date handling
Dates are stored as ISO strings. Comparisons use SQLite's `date()` function:
```sql
WHERE date(p.end_date) <= date('now', '+30 days')
```
