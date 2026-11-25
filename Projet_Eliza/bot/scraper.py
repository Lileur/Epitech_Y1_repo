import requests
from bs4 import BeautifulSoup
import re
import time

BASE_URL = "https://www.aleou.fr"
headers = {
    "User-Agent": "Mozilla/5.0"
}
VENUE_PATTERNS = [
    "/lieu-seminaire/",
    "/salle-seminaire/",
    "/hotel-seminaire/",
    "/centre-congres/"
]

def get_listing_url(city):
    """
    Build the listing page URL for a given city.

    Generates the URL of the page containing
    seminar and congress venues for the specified city on
    the website.

    ## Parameters
        **city**: name of the city

    ## Returns
        The complete URL of the venue listing page
    """
    city = city.lower()
    return f"{BASE_URL}/ville/lieux-congres-seminaires/{city}.html"

def get_venue_links(city):
    """
    Extract venue page links from the listing page of a city.

    Sends a request to the listing page corresponding to the given city
    and parses the HTML to collect links to individual venue pages.
    Only links matching any of the known venue page patterns
    are kept.

    ## Parameters
        **city**: name of the city

    ## Returns
        A list of venue page URLs (limited to 10 links)
    """
    url = get_listing_url(city)
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if any(pattern in href for pattern in VENUE_PATTERNS):
            if not href.startswith("http"):
                href = BASE_URL + href
            if href not in links:
                links.append(href)
    return links[:10]

def scrape_venue_page(url, city):
    """
    Extract information from a venue page.

    Downloads the HTML content of a venue page
    and parses it to retrieve information such as
    the venue name, description, and capacity.

    ## Parameters
        **url**: URL of the venue page
        **city**: city where the venue is located

    ## Returns
        A dictionary containing the venue information:
        name, city, capacity, description, and URL
    """
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")
    name = None
    description = None
    capacity = None
    h1 = soup.find("h1")
    if h1:
        name = h1.get_text(strip=True)
    desc = soup.find("meta", {"name": "description"})
    if desc:
        description = desc.get("content")
    text = soup.get_text(" ", strip=True)
    cap_match = re.search(r"Capacit[ée][^0-9]{0,20}(\d{2,5})", text)
    if cap_match:
        capacity = int(cap_match.group(1))
    return {
        "name": name,
        "city": city,
        "capacity": capacity,
        "description": description,
        "url": url
    }

def search_venues(city, min_capacity=None):
    """
    Search and filter venues in a given city.

    Retrieves venue links for the city,
    scrapes each venue page, and optionally filters
    venues by minimum capacity.
    A short delay is used between requests to avoid
    sending too many requests to the website.

    ## Parameters
        **city**: name of the city
        **min_capacity**: minimum required capacity (optional)

    ## Returns
        A list of venue dictionaries matching the criteria
        (limited to 5 results)
    """
    links = get_venue_links(city)
    venues = []
    for link in links:
        venue = scrape_venue_page(link, city)
        if not venue["name"]:
            continue
        if min_capacity and venue["capacity"]:
            if venue["capacity"] < min_capacity:
                continue
        venues.append(venue)
        time.sleep(0.8)
    return venues[:5]