import { extractKeywords } from "../AI/AIfeatures.js";

function stripHtml(text = "") {
  return String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSkills(profileSkills, jobKeywords) {
  const fromProfile = Array.isArray(profileSkills) ? profileSkills : [];
  const fromJob = jobKeywords.map((k) => k.skill);
  const merged = [...new Set([...fromProfile, ...fromJob])];
  return merged.slice(0, 12);
}

export function generateAutoResume({ candidate, profile = {}, job }) {
  const firstName = candidate.first_name || candidate.firstName || "";
  const lastName = candidate.last_name || candidate.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || candidate.email || "Candidat";
  const email = candidate.email || "";
  const phone = profile.phone || "";
  const title = profile.title || candidate.job_title || "Développeur";
  const location = profile.location || job.location || "";
  const about = profile.about || "";
  const jobTitle = job.title || "l'offre";
  const company = job.company || "l'entreprise";
  const description = stripHtml(job.description || "");
  const keywords = extractKeywords(description);
  const skills = formatSkills(profile.skills, keywords);

  const experiences = Array.isArray(profile.experiences)
    ? profile.experiences.slice(0, 4)
    : [];

  const education = Array.isArray(profile.education)
    ? profile.education.slice(0, 3)
    : [];

  const motivation = [
    `Madame, Monsieur,`,
    ``,
    `Je souhaite postuler au poste de ${jobTitle} chez ${company}.`,
    keywords.length > 0
      ? `Mon profil correspond aux compétences recherchées : ${keywords
          .slice(0, 6)
          .map((k) => k.skill)
          .join(", ")}.`
      : `Mon profil correspond aux exigences décrites dans votre offre.`,
    about ? about : `Je suis motivé(e) pour rejoindre votre équipe et contribuer à vos projets.`,
    ``,
    `Cordialement,`,
    fullName,
  ].join("\n");

  const experienceBlock =
    experiences.length > 0
      ? experiences
          .map(
            (exp) =>
              `• ${exp.title} — ${exp.company} (${exp.period})\n  ${exp.description || "Missions en lien avec le poste visé."}`,
          )
          .join("\n\n")
      : "• Expériences à compléter dans votre profil JobSense.";

  const educationBlock =
    education.length > 0
      ? education
          .map((edu) => `• ${edu.degree} — ${edu.school} (${edu.period})`)
          .join("\n")
      : "";

  const resume = [
    `${fullName.toUpperCase()}`,
    `${title}`,
    [email, phone, location].filter(Boolean).join(" · "),
    ``,
    `=== PROFIL ===`,
    about ||
      `Candidat(e) ciblant le poste ${jobTitle} chez ${company}, avec un intérêt pour les environnements techniques exigeants.`,
    ``,
    `=== COMPÉTENCES CLÉS ===`,
    skills.length > 0 ? skills.join(" · ") : "À renseigner dans le profil",
    ``,
    `=== EXPÉRIENCE ===`,
    experienceBlock,
    educationBlock ? `\n=== FORMATION ===\n${educationBlock}` : "",
    ``,
    `=== LETTRE DE MOTIVATION (auto) ===`,
    motivation,
    ``,
    `=== OFFRE CIBLÉE ===`,
    `${jobTitle} — ${company}`,
    `${job.contract_type || "CDI"} · ${job.location || ""}`,
    job.url ? `Lien : ${job.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    resume,
    coverLetter: motivation,
    matchedSkills: skills,
    keywords: keywords.map((k) => k.skill),
  };
}
