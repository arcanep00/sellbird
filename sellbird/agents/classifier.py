from __future__ import annotations

import logging
from typing import Any

from sellbird.brain import Brain
from sellbird.state import StateManager

logger = logging.getLogger("sellbird.classifier")


class BuyingSignalClassifier:
    def __init__(self, brain: Brain, state: StateManager, config):
        self.brain = brain
        self.state = state
        self.config = config

    async def classify_signals(self, company_data: dict) -> dict:
        icp = self.config.icp
        hiring_signals = getattr(icp, 'hiring_signals', [])
        product = self.config.product

        signals_to_check = hiring_signals or getattr(icp, 'titles', [])

        website_text = company_data.get("website_text", "")
        job_postings = company_data.get("job_postings", "")
        tech_stack = company_data.get("tech_stack", [])
        recent_news = company_data.get("recent_news", "")

        context_parts = []
        if website_text:
            context_parts.append(f"WEBSITE CONTENT (excerpt):\n{website_text[:800]}")
        if job_postings:
            context_parts.append(f"JOB POSTINGS:\n{job_postings[:400]}")
        if tech_stack:
            context_parts.append(f"TECH STACK: {', '.join(tech_stack[:10])}")
        if recent_news:
            context_parts.append(f"RECENT NEWS:\n{recent_news[:300]}")

        if not context_parts:
            return {
                "signals_found": [],
                "signal_strength": "none",
                "confidence": 0.0,
                "reasoning": "No data available to analyze.",
            }

        context = "\n\n".join(context_parts)

        prompt = f"""You are a buying signal analyst. Analyze this company data for buying signals.

PRODUCT WE SELL: {product.name}
WHAT IT DOES: {product.description}

SIGNALS TO LOOK FOR: {', '.join(signals_to_check)}

COMPANY: {company_data.get('name', 'unknown')}
DATA:
{context}

Identify any buying signals that suggest this company may need our product.

Respond ONLY with valid JSON:
{{
  "signals_found": [
    {{"type": "hiring", "detail": "Hiring a Head of Marketing", "strength": "strong"}},
    {{"type": "tech_gap", "detail": "No CRM detected", "strength": "medium"}}
  ],
  "signal_strength": "strong | medium | weak | none",
  "confidence": 0.85,
  "reasoning": "One sentence explanation",
  "in_market": true
}}"""

        result = await self.brain.think_json(
            prompt, agent="classifier", task="buying_signal_classification"
        )
        if not result:
            return {
                "signals_found": [],
                "signal_strength": "unknown",
                "confidence": 0.0,
                "reasoning": "Model did not return a response.",
            }
        return result

    async def classify_batch(self, companies: list[dict]) -> list[dict]:
        results = []
        for company in companies:
            try:
                result = await self.classify_signals(company)
                result["company_id"] = company.get("id", "")
                result["company_name"] = company.get("name", "")
                results.append(result)
            except Exception as e:
                logger.warning(f"Signal classification failed for {company.get('name')}: {e}")
                results.append({
                    "company_id": company.get("id", ""),
                    "company_name": company.get("name", ""),
                    "signals_found": [],
                    "signal_strength": "unknown",
                    "error": str(e),
                })
        return results

    async def research_prospect(self, prospect_data: dict, company_data: dict | None = None) -> dict:
        product = self.config.product

        company_context = ""
        if company_data:
            parts = []
            if company_data.get("description"):
                parts.append(f"Company description: {company_data['description']}")
            if company_data.get("tech_stack"):
                parts.append(f"Tech stack: {', '.join(company_data['tech_stack'][:8])}")
            if company_data.get("signals"):
                parts.append(f"Signals: {', '.join(str(s) for s in company_data['signals'][:5])}")
            company_context = "\n".join(parts)

        prompt = f"""You are a sales researcher. Based on available data, research this prospect
and produce notes useful for personalized outreach.

PROSPECT:
- Name: {prospect_data.get('first_name', '')} {prospect_data.get('last_name', '')}
- Title: {prospect_data.get('title', '')}
- Company: {prospect_data.get('company', '')}
- Industry: {prospect_data.get('industry', '')}

COMPANY DATA:
{company_context or 'No additional company data available.'}

OUR PRODUCT: {product.name} — {product.description}

Write research notes that would help craft a personalized outreach message.
Focus on: likely pain points, relevant buying signals, personalization angles.

Respond ONLY with valid JSON:
{{
  "pain_points": ["list of likely pain points"],
  "personalization_angles": ["list of ways to personalize outreach"],
  "talking_points": ["2-3 specific things to mention"],
  "research_summary": "2-3 sentence summary",
  "confidence": 0.7
}}"""

        result = await self.brain.think_json(
            prompt, agent="classifier", task="prospect_research"
        )
        if not result:
            return {"research_summary": "No research available.", "confidence": 0.0}
        return result
