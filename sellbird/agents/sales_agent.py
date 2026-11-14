from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sellbird.brain import Brain
from sellbird.state import StateManager

logger = logging.getLogger("sellbird.sales_agent")


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


class SalesAgent:
    def __init__(self, brain: Brain, state: StateManager, config):
        self.brain = brain
        self.state = state
        self.config = config

    async def generate_business_profile(self, product_id: str | None = None) -> dict:
        product = self._get_product(product_id)
        persona = self.config.persona

        prompt = f"""You are a business analyst. Based on this company and product information,
write a concise business profile that a sales team would use to understand who they are selling for.

COMPANY: {persona.company}
ROLE SELLING: {persona.role}
PRODUCT: {product['name']}
PRODUCT DESCRIPTION: {product['description']}
PRICING: {product['pricing']}
KEY BENEFITS:
{chr(10).join(f'- {b}' for b in product['key_benefits'])}

Write a business profile with these sections:
- Company Overview (2-3 sentences)
- What We Sell (1-2 sentences, plain language)
- Who We Help (the type of customer)
- Core Value Proposition (one sentence)
- Competitive Advantages (3 bullet points)

Respond ONLY with valid JSON:
{{
  "company_overview": "...",
  "what_we_sell": "...",
  "who_we_help": "...",
  "value_proposition": "...",
  "competitive_advantages": ["...", "...", "..."]
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="business_profile")
        if not result:
            return {"error": "Model did not return a response. Check that Ollama is running."}

        await self.state.log_action(
            action_type="generate_business_profile",
            agent="sales_agent",
            details={"product": product['name']},
        )
        return result

    async def generate_icp(self, product_id: str | None = None) -> dict:
        product = self._get_product(product_id)

        prompt = f"""You are a sales strategist. Based on this product, define the Ideal Customer Profile (ICP).

PRODUCT: {product['name']}
DESCRIPTION: {product['description']}
PRICING: {product['pricing']}
KEY BENEFITS:
{chr(10).join(f'- {b}' for b in product['key_benefits'])}

Define the ICP with these fields. Be specific and actionable.

Respond ONLY with valid JSON:
{{
  "industries": ["list of 3-5 specific industries"],
  "company_sizes": ["e.g. 10-50 employees", "50-200 employees"],
  "job_titles": ["list of 4-6 decision maker titles"],
  "geographies": ["list of target regions"],
  "pain_points": ["list of 3-5 specific pain points this product solves"],
  "buying_triggers": ["list of 3-5 events that make them ready to buy"],
  "disqualifiers": ["list of 2-3 companies that are NOT a good fit"]
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="icp_generation")
        if not result:
            return {"error": "Model did not return a response. Check that Ollama is running."}

        await self.state.log_action(
            action_type="generate_icp",
            agent="sales_agent",
            details={"product": product['name']},
        )
        return result

    async def generate_problem_statement(self, prospect_data: dict, product_id: str | None = None) -> dict:
        product = self._get_product(product_id)

        company = prospect_data.get("company", "this company")
        title = prospect_data.get("title", "decision maker")
        notes = prospect_data.get("notes", "")
        signals = prospect_data.get("signals", [])

        signals_text = ""
        if signals:
            signals_text = "\nBUYING SIGNALS DETECTED:\n" + "\n".join(f"- {s}" for s in signals)
        if notes:
            signals_text += f"\nRESEARCH NOTES:\n{notes}"

        prompt = f"""You are a sales consultant. Based on the prospect info below, write a specific problem statement
that connects their situation to what our product solves.

PROSPECT:
- Company: {company}
- Title: {title}{signals_text}

OUR PRODUCT: {product['name']}
WHAT IT SOLVES: {product['description']}

Write a problem statement that:
1. Names a specific, observable problem this company likely has
2. Quantifies the cost or pain of that problem
3. Shows how our product directly addresses it

Respond ONLY with valid JSON:
{{
  "problem": "One sentence describing the specific problem",
  "cost_of_problem": "What it costs them (time, money, missed opportunity)",
  "solution_fit": "How our product specifically solves this",
  "hook": "A single opening line for a cold email based on this"
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="problem_statement")
        if not result:
            return {"error": "Model did not return a response. Check that Ollama is running."}
        return result

    async def score_prospect(self, prospect_data: dict, product_id: str | None = None) -> dict:
        product = self._get_product(product_id)
        icp = self.config.icp

        icp_industries = getattr(icp, 'industries', [])
        icp_titles = getattr(icp, 'titles', [])
        icp_size = getattr(icp, 'company_size', '')

        prompt = f"""You are a sales qualification expert. Score this prospect against our ICP.

ICP DEFINITION:
- Target Industries: {', '.join(icp_industries)}
- Target Titles: {', '.join(icp_titles)}
- Company Size: {icp_size}
- Product: {product['name']}

PROSPECT:
- Company: {prospect_data.get('company', 'unknown')}
- Title: {prospect_data.get('title', 'unknown')}
- Industry: {prospect_data.get('industry', 'unknown')}
- Company Size: {prospect_data.get('company_size', 'unknown')}
- Buying Signals: {', '.join(prospect_data.get('signals', []))}
- Notes: {prospect_data.get('notes', '')}

Score on a scale of 0-100. Consider:
- Industry fit (25 points)
- Title/seniority fit (25 points)
- Company size fit (20 points)
- Buying signals present (30 points)

Respond ONLY with valid JSON:
{{
  "score": 75,
  "grade": "A",
  "industry_fit": 20,
  "title_fit": 22,
  "size_fit": 18,
  "signal_score": 15,
  "reasoning": "One sentence explaining the score",
  "recommended_action": "immediate_outreach | nurture | disqualify"
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="prospect_scoring")
        if not result:
            return {"score": 0, "error": "Model did not return a response."}
        return result

    async def generate_email(
        self,
        prospect_data: dict,
        problem_statement: dict | None = None,
        product_id: str | None = None,
    ) -> dict:
        product = self._get_product(product_id)
        persona = self.config.persona

        problem_hook = ""
        if problem_statement and not problem_statement.get("error"):
            problem_hook = f"\nUSE THIS HOOK: {problem_statement.get('hook', '')}"
            problem_hook += f"\nPROBLEM TO REFERENCE: {problem_statement.get('problem', '')}"

        prompt = f"""You are an expert cold email writer. Write a short, personalized cold email.

SENDER:
- Name: {persona.name}
- Company: {persona.company}
- Role: {persona.role}
- Tone: {persona.tone}

PRODUCT: {product['name']}
WHAT IT DOES: {product['description']}
ENTRY OFFER: {product.get('offer', {}).get('entry', 'a free consultation')}

PROSPECT:
- Name: {prospect_data.get('first_name', '')} {prospect_data.get('last_name', '')}
- Title: {prospect_data.get('title', '')}
- Company: {prospect_data.get('company', '')}
- Notes: {prospect_data.get('notes', '')}{problem_hook}

RULES:
- Under 75 words for the body
- One specific observation about them, one question
- No pitch, no features list
- Subject line: lowercase, 2-5 words
- Do not mention AI or automation tools

Respond ONLY with valid JSON:
{{
  "subject": "...",
  "body": "...",
  "word_count": 0
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="email_generation")
        if not result:
            return {"error": "Model did not return a response. Check that Ollama is running."}

        if isinstance(result, dict) and result.get("body"):
            result["word_count"] = len(result["body"].split())
        return result

    async def classify_reply(self, reply_text: str, context: dict | None = None) -> dict:
        prompt = f"""You are a sales reply analyst. Classify this email reply.

REPLY:
{reply_text}

CONTEXT:
- Prospect: {(context or {}).get('prospect_name', 'unknown')}
- Product discussed: {(context or {}).get('product', 'unknown')}

Classify the reply intent and suggest the next action.

Respond ONLY with valid JSON:
{{
  "intent": "interested | not_interested | objection | question | out_of_office | referral | unsubscribe",
  "sentiment": "positive | neutral | negative",
  "key_points": ["list of main points from the reply"],
  "suggested_response": "Brief description of how to respond",
  "urgency": "high | medium | low",
  "follow_up_days": 0
}}"""

        result = await self.brain.think_json(prompt, agent="sales_agent", task="reply_classification")
        if not result:
            return {"intent": "unknown", "error": "Model did not return a response."}
        return result

    def _get_product(self, product_id: str | None = None) -> dict:
        if product_id:
            products = getattr(self.config, 'products', [])
            for p in products:
                if getattr(p, 'name', '') == product_id:
                    return {
                        'name': p.name,
                        'description': p.description,
                        'pricing': p.pricing,
                        'key_benefits': p.key_benefits,
                        'offer': {'entry': getattr(getattr(p, 'offer', None), 'entry', '')},
                    }

        p = self.config.product
        return {
            'name': p.name,
            'description': p.description,
            'pricing': p.pricing,
            'key_benefits': p.key_benefits,
            'offer': {'entry': getattr(getattr(p, 'offer', None), 'entry', '')},
        }
