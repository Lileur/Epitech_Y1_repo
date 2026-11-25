import discord
import requests
from scraper import search_venues
import asyncio
import re
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
LMSTUDIO_URL = "http://127.0.0.1:1234"
MODEL_NAME = "tinyllama-1.1b-chat-v1.0"

CITIES = [
"paris","lyon","marseille","lille","bordeaux","toulouse","nice","nantes","rennes","strasbourg",
"montpellier","grenoble","dijon","angers","reims","saint-etienne","toulon","le havre"
]

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

def ask_llm(messages):
    """
    Send messages to the language model API.

    Sends a request to the local LLM server
    and returns the generated response.

    ## Parameters
        **messages**: list of messages for the model

    ## Returns
        The generated text response or an error message
    """
    payload = {"model": MODEL_NAME,"messages": messages}
    try:
        r = requests.post(f"{LMSTUDIO_URL}/v1/chat/completions", json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]
    except:
        return "Failure to generate a response."

def detect_city(message):
    """
    Detect a city name in the message.

    Checks if one of the known cities
    is present in the user message.

    ## Parameters
        **message**: user input text

    ## Returns
        The detected city or None
    """
    text = message.lower()
    for city in CITIES:
        if city in text:
            return city
    return None

def detect_capacity(message):
    """
    Extract a capacity number from the message.

    Finds a number in the text and checks
    if it is in a valid range.

    ## Parameters
        **message**: user input text

    ## Returns
        The capacity as an integer or None
    """
    numbers = re.findall(r"\d+", message)
    if numbers:
        n = int(numbers[0])
        if n > 10 and n < 10000:
            return n
    return None

def detect_intent(message):
    """
    Detect the user intent from the message.

    Classifies the message as a venue search,
    a presentation request, or general chat.

    ## Parameters
        **message**: user input text

    ## Returns
        A string: "search", "presentation", or "chat"
    """
    text = message.lower()
    venue_words = [
        "venue","place","location","room","salle","lieu",
        "hotel","conference","seminar","event space",
        "guests","attendees","people","party","event"
    ]
    presentation_words = [
        "present","presentation","speech","pitch","introduce","describe"
    ]
    if any(w in text for w in presentation_words):
        return "presentation"
    if any(w in text for w in venue_words):
        return "search"
    return "chat"

def format_with_llm(city, venues):
    """
    Format venue results using the LLM.

    Sends venue data to the model to create
    a short and clear recommendation message.

    ## Parameters
        **city**: selected city
        **venues**: list of venue dictionaries

    ## Returns
        A formatted recommendation message
    """
    text = ""
    for v in venues:
        text += f"""
Name: {v['name']}
Capacity: {v['capacity']}
Description: {v['description']}
URL: {v['url']}
"""
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system","content": "You help users find venues. Only use the provided data. Do not invent venues."},
            {"role": "user","content": f"""
City: {city}
Venues:
{text}
Recommend the best options in a short message.
"""}
        ]
    }
    try:
        r = requests.post(f"{LMSTUDIO_URL}/v1/chat/completions", json=payload)
        data = r.json()
        return data["choices"][0]["message"]["content"]
    except:
        return "Failure to format the response"

def venue_presentation(message):
    """
    Generate a short presentation for a venue.

    Uses the LLM to create a speech-style
    description based on the user message.

    ## Parameters
        **message**: user input text

    ## Returns
        A presentation text
    """
    messages = [
        {"role": "system","content": "You write short speeches presenting event venues."},
        {"role": "user","content": message}
    ]
    return ask_llm(messages)

def general_chat(message):
    """
    Handle general conversation with the user.

    Sends the message to the LLM for a
    general assistant response.

    ## Parameters
        **message**: user input text

    ## Returns
        A generated response
    """
    messages = [
        {"role": "system","content": "You are an assistant specialized in event planning. You must help the user in this area but not anything else if the user prompt for another domain you must respond that you are not suited for it and can only help with events queries.You must be clear about the fact that you are not human and only a tool to help"},
        {"role": "user","content": message}
    ]
    return ask_llm(messages)

@client.event
async def on_ready():
    """
    Triggered when the bot is ready.

    Displays a message in the console
    when the bot successfully connects.
    """
    print(f"Bot connected: {client.user}")

@client.event
async def on_message(message):
    """
    Handle incoming messages from users.

    Detects the user intent, extracts city
    and capacity, and sends an appropriate response.

    ## Parameters
        **message**: Discord message object
    """
    if message.author == client.user:
        return

    text = message.content
    intent = detect_intent(text)
    city = detect_city(text)
    capacity = detect_capacity(text)

    if intent == "search" and city:
        await message.channel.send("Searching venues...")
        try:
            venues = await asyncio.to_thread(search_venues, city, capacity)
        except Exception as e:
            await message.channel.send(f"Error during search: {e}")
            return
        if not venues:
            await message.channel.send("No venues found.")
            return
        response = format_with_llm(city, venues)
        await message.channel.send(response[:1900])
        return

    if intent == "presentation":
        response = venue_presentation(text)
        await message.channel.send(response[:1900])
        return

    response = general_chat(text)
    await message.channel.send(response[:1900])

client.run(DISCORD_TOKEN)