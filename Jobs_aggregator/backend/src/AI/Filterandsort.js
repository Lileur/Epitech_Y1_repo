const allowedSortFields = {
  salary: "salary",
  created_at: "created_at",
  published_at: "published_at",
  title: "title",
  company: "company",
  location: "location",
};

export async function filterAndSortJobs(queryParams, db) {
  const {
    location,
    minSalary,
    maxSalary,
    title,
    search,
    contractType,
    sortBy = "published_at",
    order = "DESC",
    limit = 50,
    offset = 0,
  } = queryParams;

  let query = `
    SELECT
      id,
      external_id,
      source,
      title,
      description,
      company,
      location,
      contract_type,
      salary,
      published_at,
      created_at
    FROM jobs
    WHERE 1 = 1
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

  if (search) {
    query += " AND (title LIKE ? OR company LIKE ? OR description LIKE ?)";
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (contractType) {
    query += " AND contract_type = ?";
    values.push(contractType);
  }

  if (minSalary) {
    query += " AND salary >= ?";
    values.push(minSalary);
  }

  if (maxSalary) {
    query += " AND salary <= ?";
    values.push(maxSalary);
  }

  const safeSortBy = allowedSortFields[sortBy] || "published_at";
  const safeOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  query += ` ORDER BY ${safeSortBy} ${safeOrder} LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [rows] = await db.execute(query, values);
  return rows;
}