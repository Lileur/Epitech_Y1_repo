# 🤖 EvenzIA — From Event Chaos to Instant Venue Decisions

EvenzIA is a Discord chatbot designed to simplify event planning by automating venue search.
Using conversational AI and a local LLM (LM Studio), it allows users to find the **3 best venues in less than one minute** based on their needs.

---

## 🧾 License

This project is published for demonstration purposes only.  
© 2026 — All rights reserved.

---

## ⚙️ Tech Stack

**Bot core**
- Python
- discord.py
- requests
- python-dotenv
- asyncio
- re

**LLM integration**
- LM Studio (local API server)
- tinyllama-1.1b-chat-v1.0

**Data processing**
- Custom scraper
- Filtering logic

---

## 🧠 Concept

EvenzIA solves a simple problem:

> Finding a venue is slow, complex, and inefficient.

### The chatbot:
- Asks the right questions (city, capacity, event type)
- Processes the request instantly
- Returns only the **top 3 most relevant venues**

### Objective:
- Reduce search time from hours to seconds
- Simplify decision-making
- Avoid overwhelming the user

---

## 💡 Key Features

- ⚡ Venue search in **< 1 minute**
- 🎯 Top 3 recommendations only
- 🤖 Natural conversation via LLM
- 🔒 100% local AI (LM Studio)
- 💬 Works directly in Discord

---

## 📬 Contact

**Jules Fischer**
- Email: jules.fischer@epitech.eu
- GitHub: https://github.com/Jules-Epitech

---

**Boubault--Lefebvre Léandre**
- Email: leandre.boubault-lefebvre@epitech.eu
- GitHub: https://github.com/Léandre-Epitech

---

## ▶️ Run Locally

### Clone the repository

```bash
git clone <your-repo>
cd <your-project>
```

### Setup virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 🔑 Discord Setup

### Create a `.env` file

```env
DISCORD_TOKEN=your_discord_bot_token_here
```

### Get your Discord token

1. Go to https://discord.com/developers/applications
2. Create an application
3. Go to **Bot**
4. Click **Reset Token**
5. Copy it into your `.env`

> ⚠️ Never share this token publicly

### Invite your bot

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot
```

---

## 🧠 LM Studio Setup (Local AI)

### Install LM Studio

https://lmstudio.ai

### Download a model

Recommended:
```
tinyllama-1.1b-chat-v1.0
```

### Start the local server

1. Open LM Studio
2. Go to **Local Server**
3. Click **Start Server**

Default URL:
```
http://127.0.0.1:1234
```

### Verify configuration in your code

```python
LMSTUDIO_URL = "http://127.0.0.1:1234"
MODEL_NAME = "tinyllama-1.1b-chat-v1.0"
```

---

## ▶️ Run the Bot

```bash
python bot.py
```

Expected output:
```
Bot connected: EvenzIA
```

---

## 💬 How It Works

**Example input**

```
I need a venue in Paris for 200 people
```

**Processing steps**

1. Detect intent (search / chat / presentation)
2. Extract city and capacity
3. Scrape and filter venues
4. Send results to LLM
5. Return formatted top 3

---

## 📊 Value

**For professionals**
- Saves hours of research
- Improves productivity
- Faster decision-making

**For individuals**
- Reduces stress
- Simplifies planning
- Better user experience

---

## ⚠️ Requirements

- Python 3.10+
- LM Studio running locally
- Discord bot token

---

## 🔒 Ethics & AI Usage

- No personal data stored
- Transparent AI usage
- Recommendations based only on user input
- Human keeps final decision

---

## 🚀 Future Improvements

- Smarter ranking
- Real-time availability
- Booking integration
- Multi-language support