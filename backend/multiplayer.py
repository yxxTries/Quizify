import random
import string
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Format: { "pin": { "host": WebSocket, "players": { "name": WebSocket, ... }, "quiz": dict } }
        self.rooms = {}

    def generate_pin(self) -> str:
        for _ in range(1000):
            pin = ''.join(random.choices(string.digits, k=4))
            if pin not in self.rooms:
                return pin
        raise RuntimeError("No available PINs — server is at capacity")

    def is_player_connected(self, pin: str, player_name: str) -> bool:
        """Return True only if the player has an active, open WebSocket."""
        room = self.rooms.get(pin)
        if not room:
            return False
        ws = room["players"].get(player_name)
        if ws is None:
            return False
        # WebSocket state 1 == CONNECTED
        try:
            return ws.client_state.value == 1
        except Exception:
            return False

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
        except Exception as e:
            print(f"Warning: could not notify host of player join: {e}")

        return True

    def get_room(self, pin: str):
        return self.rooms.get(pin)

    def ensure_room_state(self, pin: str):
        room = self.get_room(pin)
        if not room:
            return None
        room.setdefault("scores", {})
        room.setdefault("streaks", {})
        room.setdefault("answer_ranks", {})
        return room

    async def broadcast_to_players(self, pin: str, message: dict):
        if pin in self.rooms:
            for player_name, player_ws in list(self.rooms[pin]["players"].items()):
                try:
                    await player_ws.send_json(message)
                except Exception as e:
                    print(f"Warning: dropping dead player connection ({player_name}): {e}")
                    await self.remove_player(pin, player_name)

    async def sync_leaderboard(self, pin: str):
        room = self.get_room(pin)
        if not room:
            return
        payload = {
            "type": "leaderboard",
            "scores": room.get("scores", {}),
            "streaks": room.get("streaks", {}),
        }
        await self.broadcast_to_players(pin, payload)
        try:
            await room["host"].send_json(payload)
        except Exception as e:
            print(f"Warning: could not sync leaderboard to host: {e}")

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
                except Exception as e:
                    print(f"Warning: could not notify host of player leave: {e}")

    async def remove_host(self, pin: str):
        if pin in self.rooms:
            # Notify all players that the game has ended/host left
            await self.broadcast_to_players(pin, {"type": "host_disconnected"})
            
            # Close all player connections
            for player_ws in self.rooms[pin]["players"].values():
                try:
                    await player_ws.close()
                except Exception as e:
                    print(f"Warning: could not close player WebSocket: {e}")
            
            del self.rooms[pin]

manager = ConnectionManager()
