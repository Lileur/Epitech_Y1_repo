export function normalizeOffers(rawOffers = []) {
  return rawOffers.map((offer) => ({
    externalId: offer.id,
    source: "welovedevs",
    title: offer.title,
    description: offer.description,
    company: offer.company?.name || "Unknown",
    location: offer.location || "Unknown",
    contractType: offer.contract_type ?? null,
    salary: offer.salary ?? null,
    publishedAt: offer.published_at ? new Date(offer.published_at) : null,
    duration: offer.duration ?? null,
  }));
}

export async function collectFromWeLoveDevs(apiKey) {
  const response = await fetch("https://epi-api.welovedevs.com/offers", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`WLD API error: ${response.status}`);
  }

  const data = await response.json();
  return normalizeOffers(Array.isArray(data) ? data : []);
}