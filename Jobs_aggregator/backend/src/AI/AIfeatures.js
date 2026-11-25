const skillDictionary = {
  javascript: ["javascript", "js", "node", "nodejs"],
  python: ["python", "py"],
  docker: ["docker", "container"],
  kubernetes: ["kubernetes", "k8s"],
  react: ["react", "reactjs"],
  mysql: ["mysql", "sql"],
  typescript: ["typescript", "ts"],
};

export function extractKeywords(description = "") {
  const text = description.toLowerCase();
  const results = [];

  for (const [skill, variants] of Object.entries(skillDictionary)) {
    let score = 0;

    for (const variant of variants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedVariant}\\b`, "g");
      const matches = text.match(regex);

      if (matches) {
        score += matches.length;
      }
    }

    if (score > 0) {
      results.push({ skill, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function computeSimilarity(keywordsA, keywordsB) {
  const mapB = new Map(keywordsB.map((keyword) => [keyword.skill, keyword.score]));

  let score = 0;

  for (const keyword of keywordsA) {
    if (mapB.has(keyword.skill)) {
      score += Math.min(keyword.score, mapB.get(keyword.skill));
    }
  }

  return score;
}

export async function recommendJobs(targetJobId, db) {
  const [jobs] = await db.execute(`
    SELECT
      id,
      title,
      company,
      location,
      description,
      contract_type,
      salary
    FROM jobs
    WHERE description IS NOT NULL
  `);

  const targetJob = jobs.find((job) => String(job.id) === String(targetJobId));

  if (!targetJob) {
    return [];
  }

  const targetKeywords = extractKeywords(targetJob.description);

  const recommendations = jobs
    .filter((job) => String(job.id) !== String(targetJobId))
    .map((job) => {
      const keywords = extractKeywords(job.description);
      const similarity = computeSimilarity(targetKeywords, keywords);

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        contractType: job.contract_type,
        salary: job.salary,
        similarity,
        matchedSkills: keywords
          .filter((keyword) =>
            targetKeywords.some((targetKeyword) => targetKeyword.skill === keyword.skill)
          )
          .map((keyword) => keyword.skill),
      };
    })
    .filter((job) => job.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return recommendations;
}