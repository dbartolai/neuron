"""Service for logging AI model API calls to the ai_events table."""

import asyncpg
from typing import Optional
from uuid import UUID


class AIEventsService:
    """Service for logging AI events with token usage and cost tracking."""

    # Pricing per 1M tokens (in USD) - stored as micros per 1M tokens
    # Format: {model: {"input": input_price_micros_per_1M, "output": output_price_micros_per_1M}}
    MODEL_PRICING = {
        "gpt-4.1": {
            "input": 2500000,  # $2.50 per 1M input tokens = 2,500,000 micros
            "output": 10000000,  # $10.00 per 1M output tokens = 10,000,000 micros
        },
        "gpt-4o": {
            "input": 2500000,
            "output": 10000000,
        },
        "gpt-4o-mini": {
            "input": 150000,  # $0.15 per 1M input tokens
            "output": 600000,  # $0.60 per 1M output tokens
        },
        "gpt-5.1": {
            "input": 2500000,  # $2.50 per 1M input tokens (same as gpt-4.1)
            "output": 10000000,  # $10.00 per 1M output tokens (same as gpt-4.1)
        },
        "gpt-5-nano": {
            "input": 100000,  # $0.10 per 1M input tokens (cheaper for validation)
            "output": 400000,  # $0.40 per 1M output tokens (cheaper for validation)
        },
    }

    @staticmethod
    def calculate_cost(
        model: str,
        tokens_in: Optional[int],
        tokens_out: Optional[int],
    ) -> Optional[int]:
        """Calculate cost in micros (1 USD = 1,000,000 micros) based on model and token usage.
        
        Args:
            model: Model name (e.g., "gpt-4.1")
            tokens_in: Number of input tokens
            tokens_out: Number of output tokens
            
        Returns:
            Cost in micros, or None if pricing not available or tokens are None
        """
        if tokens_in is None or tokens_out is None:
            return None

        if model not in AIEventsService.MODEL_PRICING:
            # Default pricing if model not found (use gpt-5.1 pricing as fallback)
            pricing = AIEventsService.MODEL_PRICING.get("gpt-5.1", {"input": 2500000, "output": 10000000})
        else:
            pricing = AIEventsService.MODEL_PRICING[model]

        # Calculate cost: (tokens_in / 1M) * input_price + (tokens_out / 1M) * output_price
        # Convert to micros
        input_cost_micros = int((tokens_in / 1_000_000) * pricing["input"])
        output_cost_micros = int((tokens_out / 1_000_000) * pricing["output"])
        
        return input_cost_micros + output_cost_micros

    @staticmethod
    async def log_ai_event(
        db: asyncpg.Connection,
        provider: str = "openai",
        model: str = "gpt-5.1",
        user_id: Optional[UUID] = None,
        tokens_in: Optional[int] = None,
        tokens_out: Optional[int] = None,
        tokens_total: Optional[int] = None,
        chat_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
        cost_usd_micros: Optional[int] = None,
    ) -> None:
        """Log an AI event to the ai_events table.
        
        Args:
            db: Database connection
            provider: AI provider name (default: "openai")
            model: Model name (default: "gpt-4.1")
            user_id: User UUID (optional, defaults to auth.uid() in DB)
            tokens_in: Input token count
            tokens_out: Output token count
            tokens_total: Total token count (calculated if not provided)
            chat_id: Chat log UUID (optional)
            thread_id: Thread UUID (optional)
            cost_usd_micros: Cost in micros (calculated if not provided)
        """
        # Calculate tokens_total if not provided
        if tokens_total is None and tokens_in is not None and tokens_out is not None:
            tokens_total = tokens_in + tokens_out

        # Calculate cost if not provided
        if cost_usd_micros is None:
            cost_usd_micros = AIEventsService.calculate_cost(model, tokens_in, tokens_out)

        query = """
            INSERT INTO ai_events (
                provider,
                model,
                "user",
                tokens_in,
                tokens_out,
                tokens_total,
                chat_id,
                thread_id,
                cost_usd_micros
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """

        try:
            await db.execute(
                query,
                provider,
                model,
                user_id,
                tokens_in,
                tokens_out,
                tokens_total,
                chat_id,
                thread_id,
                cost_usd_micros,
            )
        except Exception as e:
            # Log error but don't break main functionality
            print(f"Failed to log AI event: {str(e)}")
            # Re-raise in development, but in production you might want to silently fail
            # raise
