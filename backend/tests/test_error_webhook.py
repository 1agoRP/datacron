import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_error_webhook_404(auth_client: AsyncClient):
    """
    Test that a 404 response triggers the webhook forwarding mechanism.
    """
    with patch("app.main._send_error_webhook") as mock_webhook:
        resp = await auth_client.get("/api/endpoint_that_does_not_exist")
        assert resp.status_code == 404
        # Because we use asyncio.create_task in FastAPI exception handlers,
        # we might need a small delay or we can just check if it was called.
        # Actually, in a test environment, the task might be executed immediately
        # or we might need asyncio.sleep(0.1)
        import asyncio
        await asyncio.sleep(0.1)
        
        mock_webhook.assert_called_once()
        args, _ = mock_webhook.call_args
        error_data = args[0]
        assert error_data["status_code"] == 404
        assert error_data["type"] == "HTTPException"
        assert error_data["detail"] == "Not Found"
        assert "/api/endpoint_that_does_not_exist" in error_data["url"]

@pytest.mark.asyncio
async def test_error_webhook_422(auth_client: AsyncClient):
    """
    Test that a 422 validation error triggers the webhook.
    """
    with patch("app.main._send_error_webhook") as mock_webhook:
        # POST to auth without body should raise 422
        resp = await auth_client.post("/api/auth/login")
        assert resp.status_code == 422
        
        import asyncio
        await asyncio.sleep(0.1)
        
        mock_webhook.assert_called_once()
        args, _ = mock_webhook.call_args
        error_data = args[0]
        assert error_data["status_code"] == 422
        assert error_data["type"] == "ValidationError"
        assert "errors" in error_data

@pytest.mark.asyncio
async def test_error_webhook_500(auth_client: AsyncClient):
    """
    Test that an unhandled exception triggers the webhook with status 500.
    """
    with patch("app.main._send_error_webhook") as mock_webhook:
        # We need an endpoint that raises an exception. We can mock one temporarily.
        with patch("app.routers.auth.get_current_user", side_effect=Exception("Simulated 500 error")):
            resp = await auth_client.get("/api/auth/me")
            assert resp.status_code == 500
            
            import asyncio
            await asyncio.sleep(0.1)
            
            mock_webhook.assert_called_once()
            args, _ = mock_webhook.call_args
            error_data = args[0]
            assert error_data["status_code"] == 500
            assert error_data["type"] == "UnhandledException"
            assert "Simulated 500 error" in error_data["exception"]
            assert "traceback" in error_data

@pytest.mark.asyncio
async def test_error_webhook_logging():
    """
    Test that a standard logger.error() call triggers the logging webhook.
    """
    import logging
    from app.main import logger
    
    with patch("app.main._send_log_webhook") as mock_webhook:
        logger.error("This is a simulated background error")
        
        import asyncio
        # Yield to event loop to let the task start
        await asyncio.sleep(0.1)
        
        mock_webhook.assert_called_once()
        args, _ = mock_webhook.call_args
        error_data = args[0]
        assert error_data["type"] == "ApplicationLog"
        assert error_data["level"] == "ERROR"
        assert error_data["message"] == "This is a simulated background error"
        assert "This is a simulated background error" in error_data["formatted_log"]
