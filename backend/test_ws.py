import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws/host"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as ws:
            print("Connected.")
            await ws.send(json.dumps({"type": "create"}))
            print("Sent create request.")
            response = await ws.recv()
            print(f"Received: {response}")
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(test())
