from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("sellbird.api.routes")

router = APIRouter()


def _get_brain_and_state():
    try:
        from sellbird.config import load_config
        from sellbird.state import StateManager
        from sellbird.brain import Brain

        config = load_config()
        state = StateManager()
        brain = Brain(state, brain_config=config.brain)
        return brain, state, config
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not load config or brain: {e}")


class ProspectInput(BaseModel):
    first_name: str = ""
    last_name: str = ""
    title: str = ""
    company: str = ""
    industry: str = ""
    company_size: str = ""
    notes: str = ""
    signals: list[str] = []
    product_id: str | None = None


class CompanyInput(BaseModel):
    id: str = ""
    name: str = ""
    domain: str = ""
    description: str = ""
    website_text: str = ""
    job_postings: str = ""
    tech_stack: list[str] = []
    recent_news: str = ""
    signals: list[Any] = []


class ReplyInput(BaseModel):
    reply_text: str
    prospect_name: str = ""
    product: str = ""


@router.get("/health")
async def health():
    from sellbird.ollama_runtime import check_ollama, OllamaError
    from sellbird.hardware import detect, recommend_model

    ollama_status = "ok"
    ollama_error = ""
    try:
        check_ollama()
    except OllamaError as e:
        ollama_status = "unavailable"
        ollama_error = str(e)

    hw = detect()
    recommendation = recommend_model(hw)

    return {
        "status": "ok",
        "ollama": ollama_status,
        "ollama_error": ollama_error,
        "hardware": hw,
        "recommended_model": recommendation,
    }


@router.post("/business-profile")
async def business_profile(product_id: str | None = None):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    result = await agent.generate_business_profile(product_id=product_id)
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@router.post("/icp")
async def generate_icp(product_id: str | None = None):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    result = await agent.generate_icp(product_id=product_id)
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@router.post("/buying-signals")
async def classify_buying_signals(company: CompanyInput):
    from sellbird.agents.classifier import BuyingSignalClassifier
    brain, state, config = _get_brain_and_state()
    classifier = BuyingSignalClassifier(brain, state, config)
    result = await classifier.classify_signals(company.model_dump())
    return result


@router.post("/problem-statement")
async def generate_problem_statement(prospect: ProspectInput):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    result = await agent.generate_problem_statement(
        prospect_data=prospect.model_dump(),
        product_id=prospect.product_id,
    )
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@router.post("/score-prospect")
async def score_prospect(prospect: ProspectInput):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    result = await agent.score_prospect(
        prospect_data=prospect.model_dump(),
        product_id=prospect.product_id,
    )
    return result


@router.post("/generate-email")
async def generate_email(prospect: ProspectInput):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    problem = await agent.generate_problem_statement(
        prospect_data=prospect.model_dump(),
        product_id=prospect.product_id,
    )
    result = await agent.generate_email(
        prospect_data=prospect.model_dump(),
        problem_statement=problem,
        product_id=prospect.product_id,
    )
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@router.post("/classify-reply")
async def classify_reply(reply: ReplyInput):
    from sellbird.agents.sales_agent import SalesAgent
    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)
    result = await agent.classify_reply(
        reply_text=reply.reply_text,
        context={"prospect_name": reply.prospect_name, "product": reply.product},
    )
    return result


@router.post("/research-prospect")
async def research_prospect(prospect: ProspectInput, company: CompanyInput | None = None):
    from sellbird.agents.classifier import BuyingSignalClassifier
    brain, state, config = _get_brain_and_state()
    classifier = BuyingSignalClassifier(brain, state, config)
    result = await classifier.research_prospect(
        prospect_data=prospect.model_dump(),
        company_data=company.model_dump() if company else None,
    )
    return result


@router.get("/prospects")
async def list_prospects(status: str | None = None, limit: int = 50):
    from sellbird.state import StateManager
    state = StateManager()
    await state.init_db()
    if status:
        prospects = await state.get_prospects_by_status(status)
    else:
        prospects = await state.get_prospects_by_status("new")
    return [
        {
            "id": p.id,
            "name": p.full_name(),
            "email": p.email,
            "title": p.title,
            "company": p.company,
            "industry": p.industry,
            "score": p.score,
            "status": p.status,
            "email_status": getattr(p, "email_status", ""),
        }
        for p in prospects[:limit]
    ]


@router.post("/score-all-prospects")
async def score_all_prospects(product_id: str | None = None):
    from sellbird.agents.sales_agent import SalesAgent
    from sellbird.state import StateManager

    brain, state, config = _get_brain_and_state()
    agent = SalesAgent(brain, state, config)

    prospects = await state.get_prospects_by_status("new")
    if not prospects:
        return {"scored": 0, "results": []}

    results = []
    for p in prospects[:20]:
        prospect_data = {
            "first_name": p.first_name,
            "last_name": p.last_name,
            "title": p.title,
            "company": p.company,
            "industry": p.industry,
            "notes": p.personalization_notes or "",
            "signals": [],
        }
        score_result = await agent.score_prospect(prospect_data, product_id=product_id)
        score = score_result.get("score", 0)
        if isinstance(score, (int, float)):
            async with state._connect() as db:
                await db.execute(
                    "UPDATE prospects SET score = ?, updated_at = datetime('now') WHERE id = ?",
                    (int(score), p.id),
                )
                await db.commit()
        results.append({
            "prospect_id": p.id,
            "name": p.full_name(),
            "company": p.company,
            **score_result,
        })

    return {"scored": len(results), "results": results}


@router.get("/products")
async def list_products():
    try:
        from sellbird.config import load_config
        config = load_config()
        products = []
        main = config.product
        products.append({
            "id": main.name,
            "name": main.name,
            "description": main.description,
            "pricing": main.pricing,
            "is_primary": True,
        })
        for p in getattr(config, 'products', []):
            if p.name != main.name:
                products.append({
                    "id": p.name,
                    "name": p.name,
                    "description": p.description,
                    "pricing": p.pricing,
                    "is_primary": False,
                })
        return products
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/inference-logs")
async def inference_logs(limit: int = 50):
    from sellbird.state import StateManager
    state = StateManager()
    await state.init_db()
    async with state._connect() as db:
        db.row_factory = __import__("aiosqlite").Row
        async with db.execute(
            "SELECT * FROM inference_log ORDER BY created_at DESC LIMIT ?", (limit,)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]
