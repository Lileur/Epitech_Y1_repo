const skillDictionary = {
  javascript: ["javascript", "js", "node", "nodejs"],
  python: ["python", "py"],
  docker: ["docker", "container"],
  kubernetes: ["kubernetes", "k8s"],
  react: ["react", "reactjs"]
};

function extractKeywords(description) {
  const text = description.toLowerCase();

  const results = [];

  for (const [skill, variants] of Object.entries(skillDictionary)) {
    let score = 0;

    variants.forEach(variant => {
      const regex = new RegExp(`\\b${variant}\\b`, "g");
      const matches = text.match(regex);
      if (matches) score += matches.length;
    });

    if (score > 0) {
      results.push({ skill, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function computeSimilarity(keywordsA, keywordsB) {
  const mapB = new Map(keywordsB.map(k => [k.skill, k.score]));

  let score = 0;

  keywordsA.forEach(k => {
    if (mapB.has(k.skill)) {
      score += Math.min(k.score, mapB.get(k.skill));
    }
  });

  return score;
}

async function recommendJobs(targetJobId, db) {
  const connection = await db.getConnection();
  const [jobs] = await connection.query(
    "SELECT id, description FROM jobs WHERE description IS NOT NULL",
  );
  connection.release();

  const targetJob = jobs.find((j) => String(j.id) === String(targetJobId));
  if (!targetJob) return [];

  const targetKeywords = extractKeywords(targetJob.description);

  const recommendations = jobs
    .filter((job) => String(job.id) !== String(targetJobId))
    .map(job => {
      const keywords = extractKeywords(job.description);
      const similarity = computeSimilarity(targetKeywords, keywords);

      return {
        id: job.id,
        similarity
      };
    })
    .filter(job => job.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return recommendations;
}

export { extractKeywords, computeSimilarity, recommendJobs };