# FounderFit 
*A free, AI-powered co-founder compatibility tool - no signup required*

## What is FounderFit?

**FounderFit** helps startup co-founders evaluate their alignment on key dimensions like vision, values, conflict style, and work habits — through a quick 10-question quiz.

After both co-founders complete the assessment, FounderFit generates a personalized **AI-powered Compatibility Report Card**, including:

- 🔢 A FounderFit Score (out of 100)  
- ⚠️ Top 3 Red Flags  
- 🌟 Core Strengths  
- 💡 Personalized Advice  

All in under 5 minutes - with zero friction.

Video Walkthrough: https://youtu.be/RSntYL8cf3w

---

## 🧩 How It Works

1. **Founder A** visits the app and answers 10 questions.
2. Gets a unique shareable link.
3. **Founder B** opens the link and answers the same 10 questions.
4. Once both are done, an AI-generated **Compatibility Report Card** appears automatically.

Users can:
- 📤 Share results on Twitter  
- 📥 Download the report card for future reference

---

## 🛠 Tech Stack

- **Frontend**: Next.js + TailwindCSS
- **Backend**: Node.js API hosted on Render
- **AI Engine**: Azure-hosted GPT-4o (OpenAI)
- **Hosting**: Netlify (frontend), Render (backend)
- **Session Handling**: Anonymous pairing via unique share links

---

## 🧪 Features

- ✅ No signup or payment required  
- ✅ Fully anonymous and fast (under 5 minutes)  
- ✅ Auto-detects when both founders finish  
- ✅ Clean, emotionally intelligent UX  
- ✅ Shareable, downloadable reports  

---

## 🧱 Challenges We Solved

- Designing meaningful yet concise 10-question assessments
- Managing two-user sessions without authentication
- Prompt engineering for GPT-4o to generate non-generic insights
- Seamless redirect logic based on async completion
- Deploying backend on Render with session persistence

---

## 🏆 Why We Built This

Too many startups fail not due to product-market fit, but because of misaligned co-founders. FounderFit gives teams a lightweight, accessible way to surface red flags and build stronger relationships — early.

---

## 📦 Local Setup Instructions

### Prerequisites

- Node.js (v18+)
- npm or yarn
- MongoDB Atlas account (or local instance)
- Azure OpenAI access with GPT-4o deployment

### Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/founderfit.git
   
2. Install dependencies
   ```bash
   cd founder-fit
   npm install

3. Set environment variables: Create a .env.local file in the root directory with the following:
    ```bash
    VITE_API_BASE_URL=http://localhost:3001
   AZURE_AI_TOKEN=abc1234567890abcdef1234567890abcdef
   AZURE_AI_ENDPOINT=https://my-openai-instance.openai.azure.com 
   AZURE_AI_MODEL_NAME=gpt-4o
   NEXT_PUBLIC_SITE_URL=http://localhost:5173

4. Run dev server:
   ```bash
   npm run dev

5. Start backend (in a separate terminal from the root directory):
   ```bash
   npm run server


    
