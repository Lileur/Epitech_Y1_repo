export async function collectFromWeLoveDevs(apiKey) {
  const apiUrl = process.env.WELOVEDEVS_API_URL;

  if (!apiUrl) {
    throw new Error("WELOVEDEVS_API_URL is missing in environment");
  }

  const response = await fetch(`${apiUrl}/API`, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WeLoveDevs API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((offer) => ({
    externalId: offer.id,
    source: "welovedevs",
    title: offer.title ?? "Untitled job",
    description: offer.description ?? "",
    company: offer.company?.name ?? "Unknown",
    location: offer.location ?? "Unknown",
    contractType: offer.contract_type ?? null,
    salary: offer.salary ?? null,
    publishedAt: offer.published_at ? new Date(offer.published_at) : null,
    duration: offer.duration ?? null,
  }));
}