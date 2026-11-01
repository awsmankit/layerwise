import type { Db } from './mini-sql';

/*
 * The invented data behind the text-to-SQL workbench: a small shop, "Pebble and Pine", in two copies.
 * `MAIN` is the database the question is scored on. `VARIANT` has the same tables and different data, the
 * way a test suite of extra databases would. Every model query below was written by hand for this lesson,
 * not produced by a real model: each one stands for a kind of mistake that real systems make.
 */

export const MAIN: Db = {
  customers: {
    columns: ['id', 'name', 'region', 'joined'],
    rows: [
      [1, 'Asha', 'North', '2024-01-10'],
      [2, 'Ben', 'North', '2024-02-03'],
      [3, 'Chloe', 'North', '2024-03-15'],
      [4, 'Dev', 'South', '2024-04-01'],
      [5, 'Elif', 'South', '2024-05-20'],
      [6, 'Farid', 'East', '2024-06-11'],
      [7, 'Grace', 'East', '2024-07-02'],
      [8, 'Hugo', 'West', '2024-08-09'],
    ],
  },
  products: {
    columns: ['id', 'name', 'category', 'price'],
    rows: [
      [1, 'Notebook A5', 'stationery', 4.5],
      [2, 'Gel pen', 'stationery', 1.8],
      [3, 'Desk lamp', 'home', 24],
      [4, 'Mug', 'home', 8],
      [5, 'Backpack', 'bags', 35],
      [6, 'Sticker pack', 'stationery', 3],
    ],
  },
  orders: {
    columns: ['id', 'customer_id', 'product_id', 'qty', 'status', 'ordered_on'],
    rows: [
      [1, 1, 1, 2, 'shipped', '2024-09-01'],
      [2, 1, 3, 1, 'shipped', '2024-09-03'],
      [3, 2, 2, 10, 'shipped', '2024-09-05'],
      [4, 2, 4, 2, 'cancelled', '2024-09-06'],
      [5, 3, 1, 1, 'shipped', '2024-09-08'],
      [6, 3, 5, 1, 'pending', '2024-09-09'],
      [7, 4, 3, 2, 'shipped', '2024-09-10'],
      [8, 4, 2, 5, 'shipped', '2024-09-12'],
      [9, 5, 5, 1, 'shipped', '2024-09-14'],
      [10, 5, 4, 3, 'cancelled', '2024-09-15'],
      [11, 6, 1, 4, 'shipped', '2024-09-16'],
      [12, 1, 2, 3, 'shipped', '2024-09-20'],
      [13, 6, 4, 1, 'pending', '2024-09-21'],
    ],
  },
};

/** Same tables, different data: other regions, one more product, one more order. */
export const VARIANT: Db = {
  customers: {
    columns: MAIN.customers.columns,
    rows: [
      [1, 'Asha', 'South', '2024-01-10'],
      [2, 'Ben', 'North', '2024-02-03'],
      [3, 'Chloe', 'East', '2024-03-15'],
      [4, 'Dev', 'North', '2024-04-01'],
      [5, 'Elif', 'South', '2024-05-20'],
      [6, 'Farid', 'West', '2024-06-11'],
      [7, 'Grace', 'East', '2024-07-02'],
      [8, 'Hugo', 'East', '2024-08-09'],
    ],
  },
  products: {
    columns: MAIN.products.columns,
    rows: [...MAIN.products.rows, [7, 'Pencil case', 'stationery', 9]],
  },
  orders: {
    columns: MAIN.orders.columns,
    rows: [...MAIN.orders.rows, [14, 7, 7, 2, 'shipped', '2024-09-25']],
  },
};

export const ALLOWED_TABLES = ['customers', 'products', 'orders'];

export type Candidate = { id: string; label: string; sql: string; note: string };
export type Question = { id: string; text: string; gold: string; hint: string; candidates: Candidate[] };

export const QUESTIONS: Question[] = [
  {
    id: 'never',
    text: 'How many customers have never placed an order?',
    gold: 'SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL',
    hint: 'Customers with no orders only appear if the join keeps unmatched rows.',
    candidates: [
      {
        id: 'never-a',
        label: 'Right answer, written differently',
        sql: 'SELECT COUNT(*) FROM customers LEFT JOIN orders ON orders.customer_id = customers.id WHERE orders.id IS NULL',
        note: 'The same logic with no table aliases. A string comparison rejects it; running it accepts it.',
      },
      {
        id: 'never-b',
        label: 'Wrong join type',
        sql: 'SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL',
        note: 'An inner join throws away exactly the customers the question is about, so it counts none.',
      },
      {
        id: 'never-c',
        label: 'Answers the opposite question',
        sql: 'SELECT COUNT(DISTINCT customer_id) FROM orders',
        note: 'This counts customers who did order. It runs without error and returns a plausible number.',
      },
    ],
  },
  {
    id: 'revenue',
    text: 'What is the total revenue from shipped orders?',
    gold: "SELECT SUM(o.qty * p.price) FROM orders o JOIN products p ON p.id = o.product_id WHERE o.status = 'shipped'",
    hint: 'Revenue is quantity times price, summed over the shipped orders.',
    candidates: [
      {
        id: 'rev-a',
        label: 'Right answer, different layout',
        sql: "SELECT SUM(orders.qty * products.price)\nFROM orders\nJOIN products ON products.id = orders.product_id\nWHERE orders.status = 'shipped';",
        note: 'Correct. Line breaks and full table names are enough to fail an exact string match.',
      },
      {
        id: 'rev-b',
        label: 'Forgets the status filter',
        sql: 'SELECT SUM(o.qty * p.price) FROM orders o JOIN products p ON p.id = o.product_id',
        note: 'Cancelled and pending orders are counted as revenue. Nothing in the SQL looks broken.',
      },
      {
        id: 'rev-c',
        label: 'Forgets the quantity',
        sql: "SELECT SUM(p.price) FROM orders o JOIN products p ON p.id = o.product_id WHERE o.status = 'shipped'",
        note: 'Adds one price per order line instead of price times quantity.',
      },
      {
        id: 'rev-d',
        label: 'A different reading of "revenue"',
        sql: "SELECT SUM(o.qty * p.price) FROM orders o JOIN products p ON p.id = o.product_id WHERE o.status IN ('shipped', 'pending')",
        note: 'Counts pending orders too. That is a defensible reading of an ambiguous word, but it is not the one the gold query uses.',
      },
    ],
  },
  {
    id: 'north',
    text: 'How many orders were placed by customers in the North region?',
    gold: "SELECT COUNT(*) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.region = 'North'",
    hint: 'The region lives on the customers table, not on orders.',
    candidates: [
      {
        id: 'north-a',
        label: 'Right answer, pattern match',
        sql: "SELECT COUNT(*) FROM orders JOIN customers ON customers.id = orders.customer_id WHERE customers.region LIKE 'nor%'",
        note: 'Correct on both databases, though fragile if a region such as Northeast is ever added.',
      },
      {
        id: 'north-b',
        label: 'Lucky shortcut',
        sql: 'SELECT COUNT(*) FROM orders WHERE customer_id <= 3',
        note: 'It never looks at the region. On the main data customers 1 to 3 happen to be the North ones, so the number matches.',
      },
      {
        id: 'north-c',
        label: 'Counts customers, not orders',
        sql: "SELECT COUNT(DISTINCT c.id) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.region = 'North'",
        note: 'DISTINCT collapses the orders into customers, so the count is the number of people.',
      },
    ],
  },
  {
    id: 'top3',
    text: 'List the three most expensive products, most expensive first.',
    gold: 'SELECT name FROM products ORDER BY price DESC LIMIT 3',
    hint: 'Because the question says "most expensive first", the order of the rows is part of the answer.',
    candidates: [
      {
        id: 'top-a',
        label: 'Right answer, with an alias',
        sql: 'SELECT p.name FROM products AS p ORDER BY p.price DESC LIMIT 3;',
        note: 'Correct. The alias makes the text differ from the gold query.',
      },
      {
        id: 'top-b',
        label: 'Right products, wrong order',
        sql: 'SELECT name FROM products WHERE price > 5 ORDER BY price ASC',
        note: 'On the main data this returns the same three products, reversed. It also hard-codes a price cut-off.',
      },
      {
        id: 'top-c',
        label: 'The cheapest three',
        sql: 'SELECT name FROM products ORDER BY price ASC LIMIT 3',
        note: 'One word, ASC instead of DESC, and the answer is the opposite.',
      },
    ],
  },
];
