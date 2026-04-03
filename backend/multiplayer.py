import random
import string
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Format: { "pin": { "host": WebSocket, "players": { "name": WebSocket, ... }, "quiz": dict } }
        self.rooms = {}

    def generate_pin(self) -> str:
        while True:
            pin = ''.join(random.choices(string.digits, k=4))
            if pin not in self.rooms:
                return pin

    async def join_room(self, pin: str, player_name: str, player_ws: WebSocket) -> bool:
        if pin not in self.rooms:
            return False
        
        self.rooms[pin]["players"][player_name] = player_ws
        
        # Notify host that a player joined
        try:
            await self.rooms[pin]["host"].send_json({
                "type": "player_joined",
                "name": player_name
            })
        except Exception:
            pass # Host might have disconnected
            
        return True

    def get_room(self, pin: str):
        return self.rooms.get(pin)

    async def broadcast_to_players(self, pin: str, message: dict):
        if pin in self.rooms:
            for player_name, player_ws in list(self.rooms[pin]["players"].items()):
                try:
                    await player_ws.send_json(message)
                except Exception:
                    # Remove player if connection is dead
                    await self.remove_player(pin, player_name)

    async def remove_player(self, pin: str, player_name: str):
        if pin in self.rooms:
            if player_name in self.rooms[pin]["players"]:
                del self.rooms[pin]["players"][player_name]
                # Notify host
                try:
                    await self.rooms[pin]["host"].send_json({
                        "type": "player_left",
                        "name": player_name
                    })
                except Exception:
                    pass

    async def remove_host(self, pin: str):
        if pin in self.rooms:
            # Notify all players that the game has ended/host left
            await self.broadcast_to_players(pin, {"type": "host_disconnected"})
            
            # Close all player connections
            for player_ws in self.rooms[pin]["players"].values():
                try:
                    await player_ws.close()
                except Exception:
                    pass
            
            del self.rooms[pin]

manager = ConnectionManager()
