export async function filterAndSortJobs(queryParams, db) {
  const {
    location,
    minSalary,
    maxSalary,
    title,
    sortBy = "salary_min",
    order = "DESC",
  } = queryParams;

  let query = `
    SELECT id, title, location, salary_min, salary_max, created_at
    FROM jobs
    WHERE 1=1
  `;

  const values = [];

  if (location) {
    query += " AND location LIKE ?";
    values.push(`%${location}%`);
  }

  if (title) {
    query += " AND title LIKE ?";
    values.push(`%${title}%`);
  }

  if (minSalary) {
    query += " AND salary_min >= ?";
    values.push(Number(minSalary));
  }

  if (maxSalary) {
    query += " AND salary_max <= ?";
    values.push(Number(maxSalary));
  }

  const allowedSortFields = ["salary_min", "salary_max", "created_at", "title"];
  const allowedOrder = ["ASC", "DESC"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "salary_min";
  const safeOrder = allowedOrder.includes(order.toUpperCase())
    ? order.toUpperCase()
    : "DESC";

  query += ` ORDER BY ${safeSortBy} ${safeOrder}`;

  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(query, values);
    return rows;
  } finally {
    connection.release();
  }
}