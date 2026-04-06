# =============================================================================
#  routing_service.py  —  VIT Hostel Hybrid Spatial Routing Engine
#  Author: ADVS Smart Hostel System
#
#  Architecture:
#    Outside-block distance  →  Real data from Excel distance matrices
#    Inside-block distance   →  Topological math from room number parsing
#    Total cost              =  outside_dist + (Δfloor × FLOOR_W) + (Δroom × ROOM_W)
#
#  HARD CONSTRAINT: MH staff never cross into WH blocks and vice-versa.
# =============================================================================

from __future__ import annotations
from typing import Optional
import re


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 1 — TOPOLOGY WEIGHTS
#  Tune these to reflect actual walking effort at VIT.
# ─────────────────────────────────────────────────────────────────────────────

FLOOR_WEIGHT = 30   # cost (metres-equivalent) per floor climbed / descended
ROOM_WEIGHT  = 3    # cost per room number delta along a corridor


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 2 — MEN'S HOSTEL (MH) DISTANCE MATRIX
#  Blocks: A B C D E F G H J K L M N P Q R T
#  Source: Men_s_Hostel_Block_Distance_Matrices.xlsx (actual distances, metres)
# ─────────────────────────────────────────────────────────────────────────────

MH_BLOCKS = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T'}

MH_DISTANCE: dict[str, dict[str, float]] = {
    'A': {'A':    0, 'B':   60, 'C':  120, 'D':  180, 'E':  250, 'F':  300,
          'G':  450, 'H':  500, 'J':  550, 'K':  600, 'L':  650, 'M':  800,
          'N':  850, 'P':  900, 'Q': 1100, 'R': 1200, 'T': 1500},

    'B': {'A':   60, 'B':    0, 'C':   60, 'D':  120, 'E':  190, 'F':  240,
          'G':  390, 'H':  440, 'J':  490, 'K':  540, 'L':  590, 'M':  740,
          'N':  790, 'P':  840, 'Q': 1040, 'R': 1140, 'T': 1440},

    'C': {'A':  120, 'B':   60, 'C':    0, 'D':   80, 'E':  150, 'F':  200,
          'G':  350, 'H':  400, 'J':  450, 'K':  500, 'L':  550, 'M':  700,
          'N':  750, 'P':  800, 'Q': 1000, 'R': 1100, 'T': 1400},

    'D': {'A':  180, 'B':  120, 'C':   80, 'D':    0, 'E':   70, 'F':  120,
          'G':  270, 'H':  320, 'J':  370, 'K':  420, 'L':  470, 'M':  620,
          'N':  670, 'P':  720, 'Q':  920, 'R': 1020, 'T': 1320},

    'E': {'A':  250, 'B':  190, 'C':  150, 'D':   70, 'E':    0, 'F':   60,
          'G':  200, 'H':  250, 'J':  300, 'K':  350, 'L':  400, 'M':  550,
          'N':  600, 'P':  650, 'Q':  850, 'R':  950, 'T': 1250},

    'F': {'A':  300, 'B':  240, 'C':  200, 'D':  120, 'E':   60, 'F':    0,
          'G':  150, 'H':  200, 'J':  250, 'K':  300, 'L':  350, 'M':  500,
          'N':  550, 'P':  600, 'Q':  800, 'R':  900, 'T': 1200},

    'G': {'A':  450, 'B':  390, 'C':  350, 'D':  270, 'E':  200, 'F':  150,
          'G':    0, 'H':   60, 'J':  110, 'K':  160, 'L':  210, 'M':  350,
          'N':  400, 'P':  450, 'Q':  650, 'R':  750, 'T': 1050},

    'H': {'A':  500, 'B':  440, 'C':  400, 'D':  320, 'E':  250, 'F':  200,
          'G':   60, 'H':    0, 'J':   50, 'K':  100, 'L':  150, 'M':  300,
          'N':  350, 'P':  400, 'Q':  600, 'R':  700, 'T': 1000},

    'J': {'A':  550, 'B':  490, 'C':  450, 'D':  370, 'E':  300, 'F':  250,
          'G':  110, 'H':   50, 'J':    0, 'K':   50, 'L':  100, 'M':  250,
          'N':  300, 'P':  350, 'Q':  550, 'R':  650, 'T':  950},

    'K': {'A':  600, 'B':  540, 'C':  500, 'D':  420, 'E':  350, 'F':  300,
          'G':  160, 'H':  100, 'J':   50, 'K':    0, 'L':   60, 'M':  200,
          'N':  250, 'P':  300, 'Q':  500, 'R':  600, 'T':  900},

    'L': {'A':  650, 'B':  590, 'C':  550, 'D':  470, 'E':  400, 'F':  350,
          'G':  210, 'H':  150, 'J':  100, 'K':   60, 'L':    0, 'M':  150,
          'N':  200, 'P':  250, 'Q':  450, 'R':  550, 'T':  850},

    'M': {'A':  800, 'B':  740, 'C':  700, 'D':  620, 'E':  550, 'F':  500,
          'G':  350, 'H':  300, 'J':  250, 'K':  200, 'L':  150, 'M':    0,
          'N':   60, 'P':  110, 'Q':  300, 'R':  400, 'T':  700},

    'N': {'A':  850, 'B':  790, 'C':  750, 'D':  670, 'E':  600, 'F':  550,
          'G':  400, 'H':  350, 'J':  300, 'K':  250, 'L':  200, 'M':   60,
          'N':    0, 'P':   60, 'Q':  250, 'R':  350, 'T':  650},

    'P': {'A':  900, 'B':  840, 'C':  800, 'D':  720, 'E':  650, 'F':  600,
          'G':  450, 'H':  400, 'J':  350, 'K':  300, 'L':  250, 'M':  110,
          'N':   60, 'P':    0, 'Q':  200, 'R':  300, 'T':  600},

    'Q': {'A': 1100, 'B': 1040, 'C': 1000, 'D':  920, 'E':  850, 'F':  800,
          'G':  650, 'H':  600, 'J':  550, 'K':  500, 'L':  450, 'M':  300,
          'N':  250, 'P':  200, 'Q':    0, 'R':  100, 'T':  400},

    'R': {'A': 1200, 'B': 1140, 'C': 1100, 'D': 1020, 'E':  950, 'F':  900,
          'G':  750, 'H':  700, 'J':  650, 'K':  600, 'L':  550, 'M':  400,
          'N':  350, 'P':  300, 'Q':  100, 'R':    0, 'T':  300},

    'T': {'A': 1500, 'B': 1440, 'C': 1400, 'D': 1320, 'E': 1250, 'F': 1200,
          'G': 1050, 'H': 1000, 'J':  950, 'K':  900, 'L':  850, 'M':  700,
          'N':  650, 'P':  600, 'Q':  400, 'R':  300, 'T':    0},
}


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 3 — WOMEN'S HOSTEL (WH) DISTANCE MATRIX
#  Blocks: A B C D E F G H J S
#  Source: Ladies_Hostel_Block_Distance_Matrices.xlsx (actual distances, metres)
#  Note:   Block S has 10000 m to all other blocks — it is a standalone/
#          isolated block that must be treated as a direct-dispatch only.
# ─────────────────────────────────────────────────────────────────────────────

WH_BLOCKS = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'S'}

WH_DISTANCE: dict[str, dict[str, float]] = {
    'A': {'A':     0, 'B':    40, 'C':   100, 'D':   150, 'E':   250,
          'F':   300, 'G':   450, 'H':   600, 'J':   700, 'S': 10000},

    'B': {'A':    40, 'B':     0, 'C':    60, 'D':   110, 'E':   210,
          'F':   260, 'G':   410, 'H':   560, 'J':   660, 'S': 10000},

    'C': {'A':   100, 'B':    60, 'C':     0, 'D':    50, 'E':   150,
          'F':   200, 'G':   350, 'H':   500, 'J':   600, 'S': 10000},

    'D': {'A':   150, 'B':   110, 'C':    50, 'D':     0, 'E':   100,
          'F':   150, 'G':   300, 'H':   450, 'J':   550, 'S': 10000},

    'E': {'A':   250, 'B':   210, 'C':   150, 'D':   100, 'E':     0,
          'F':    50, 'G':   200, 'H':   350, 'J':   450, 'S': 10000},

    'F': {'A':   300, 'B':   260, 'C':   200, 'D':   150, 'E':    50,
          'F':     0, 'G':   150, 'H':   300, 'J':   400, 'S': 10000},

    'G': {'A':   450, 'B':   410, 'C':   350, 'D':   300, 'E':   200,
          'F':   150, 'G':     0, 'H':   150, 'J':   250, 'S': 10000},

    'H': {'A':   600, 'B':   560, 'C':   500, 'D':   450, 'E':   350,
          'F':   300, 'G':   150, 'H':     0, 'J':   100, 'S': 10000},

    'J': {'A':   700, 'B':   660, 'C':   600, 'D':   550, 'E':   450,
          'F':   400, 'G':   250, 'H':   100, 'J':     0, 'S': 10000},

    'S': {'A': 10000, 'B': 10000, 'C': 10000, 'D': 10000, 'E': 10000,
          'F': 10000, 'G': 10000, 'H': 10000, 'J': 10000, 'S':     0},
}


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 4 — STAFF TYPE CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

STAFF_MH = "MH"   # Men's Hostel staff
STAFF_WH = "WH"   # Women's Hostel staff


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 5 — ROOM NUMBER PARSER
#
#  VIT room format:  <Block>-<Floor><Room>
#  Examples:         Q-415  →  Block Q, Floor 4, Room 15
#                    A-101  →  Block A, Floor 1, Room 01
#                    T-305  →  Block T, Floor 3, Room 05
#
#  The parser handles single-letter blocks (A-T, no I or O to avoid confusion)
#  and 3-digit room codes where the first digit is the floor.
# ─────────────────────────────────────────────────────────────────────────────

class RoomLocation:
    """Parsed room location from a VIT room string like 'Q-415'."""

    def __init__(self, block: str, floor: int, room_num: int, raw: str):
        self.block    = block.upper()
        self.floor    = floor
        self.room_num = room_num
        self.raw      = raw  # original string, for display

    def __repr__(self) -> str:
        return f"RoomLocation(block={self.block}, floor={self.floor}, room={self.room_num})"


def parse_room(room_str: str) -> Optional[RoomLocation]:
    """
    Parse a VIT hostel room string into a RoomLocation.

    Accepted formats:
        Q-415     →  block=Q, floor=4, room=15
        Q415      →  block=Q, floor=4, room=15
        q-415     →  case-insensitive
        WH-Q-415  →  strips zone prefix

    Returns None if the string cannot be parsed.
    """
    if not room_str:
        return None

    # Normalise and strip zone prefixes like "MH-" or "WH-"
    s = room_str.strip().upper()
    s = re.sub(r'^(MH|WH)-', '', s)

    # Match: one letter, optional dash, 3 digits
    m = re.fullmatch(r'([A-Z])-?(\d{1,2})(\d{2})', s)
    if not m:
        return None

    block    = m.group(1)
    floor    = int(m.group(2))
    room_num = int(m.group(3))

    return RoomLocation(block=block, floor=floor, room_num=room_num, raw=room_str)


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 6 — ZONE CLASSIFIER
#  Decides which distance matrix to use and validates block membership.
# ─────────────────────────────────────────────────────────────────────────────

def get_zone(block: str) -> Optional[str]:
    """
    Return 'MH' if the block belongs to Men's Hostel,
    'WH' if it belongs to Women's Hostel,
    None if unrecognised.

    Note: Both zones share block letters A-J.  The disambiguator is the
    STAFF_TYPE attached to each complaint (set at login time).
    The zone is therefore always resolved from staff_type, never from
    block letter alone.
    """
    b = block.upper()
    if b in MH_BLOCKS:
        return STAFF_MH
    if b in WH_BLOCKS:
        return STAFF_WH
    return None


def get_distance_matrix(staff_type: str) -> dict[str, dict[str, float]]:
    """Return the correct distance matrix for the given staff type."""
    if staff_type == STAFF_MH:
        return MH_DISTANCE
    if staff_type == STAFF_WH:
        return WH_DISTANCE
    raise ValueError(f"Unknown staff_type '{staff_type}'. Must be 'MH' or 'WH'.")


def get_block_set(staff_type: str) -> set[str]:
    """Return the set of valid blocks for the given staff type."""
    if staff_type == STAFF_MH:
        return MH_BLOCKS
    if staff_type == STAFF_WH:
        return WH_BLOCKS
    raise ValueError(f"Unknown staff_type '{staff_type}'.")


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 7 — TOPOLOGICAL DISTANCE FORMULA
#
#  total_cost = outside_block_distance
#             + (|floor_a - floor_b| × FLOOR_WEIGHT)
#             + (|room_a  - room_b|  × ROOM_WEIGHT)
#
#  If the worker is already in the same block, outside_block_distance = 0.
#  All three components use the same metre-equivalent unit so they can
#  be added directly.
# ─────────────────────────────────────────────────────────────────────────────

def topological_distance(
    origin: RoomLocation,
    target: RoomLocation,
    staff_type: str,
) -> float:
    """
    Compute the hybrid topological cost from origin room to target room.

    Parameters
    ----------
    origin     : worker's current room (parsed)
    target     : task destination room (parsed)
    staff_type : 'MH' or 'WH'

    Returns
    -------
    float  cost in metre-equivalents (lower = faster to reach)
    """
    matrix = get_distance_matrix(staff_type)

    # --- Outside-block distance ---
    # If blocks differ, look up real distance from the matrix.
    # If either block is missing from the matrix, fall back to a large penalty
    # so the task is deprioritised rather than causing a KeyError.
    if origin.block == target.block:
        outside_dist = 0.0
    else:
        try:
            outside_dist = matrix[origin.block][target.block]
        except KeyError:
            outside_dist = 99999.0   # unknown block → lowest priority

    # --- Inside-block (topological) distance ---
    floor_cost = abs(origin.floor - target.floor) * FLOOR_WEIGHT
    room_cost  = abs(origin.room_num - target.room_num) * ROOM_WEIGHT

    return outside_dist + floor_cost + room_cost


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 8 — MAIN ROUTING ALGORITHM
#
#  calculate_optimal_route:
#    1. Filter tasks to the correct hostel zone (MH/WH firewall).
#    2. Separate CRITICAL urgency tasks → always at the top.
#    3. Sort remaining tasks by topological_distance from current location.
#    4. Combine: [critical tasks sorted by distance] + [normal tasks sorted].
#    5. Return enriched task list with cost annotations.
# ─────────────────────────────────────────────────────────────────────────────

def calculate_optimal_route(
    current_location_str: str,
    pending_tasks: list[dict],
    staff_type: str,
) -> list[dict]:
    """
    Sort pending maintenance tasks into an optimal walking route for a worker.

    Parameters
    ----------
    current_location_str : worker's current room, e.g. "Q-415"
    pending_tasks        : list of complaint dicts from the database.
                           Each dict must have at least:
                               'id', 'room_number', 'urgency', 'description'
    staff_type           : 'MH' or 'WH'

    Returns
    -------
    list[dict]  — tasks in optimal visit order, each enriched with:
        'estimated_distance'  (float, metre-equivalents)
        'route_note'          (str, human-readable explanation)
        'parsed_room'         (str, canonical room string)
    """

    # ── 1. Parse the worker's current location ──────────────────────────────
    origin = parse_room(current_location_str)
    if origin is None:
        raise ValueError(
            f"Cannot parse current location '{current_location_str}'. "
            "Expected format: <Block>-<Floor><Room>, e.g. 'Q-415'."
        )

    valid_blocks = get_block_set(staff_type)

    # ── 2. Validate worker's own block belongs to their zone ─────────────────
    if origin.block not in valid_blocks:
        raise ValueError(
            f"Worker block '{origin.block}' is not in {staff_type} zone. "
            "Possible zone mismatch — check staff_type."
        )

    # ── 3. Split tasks into critical vs normal; skip wrong-zone tasks ────────
    critical_tasks = []
    normal_tasks   = []
    skipped        = []

    for task in pending_tasks:
        dept = (task.get('department') or '').strip().lower()
        if dept == 'mess':
            continue
        raw_room = task.get('room_number', '')
        target   = parse_room(raw_room)

        if target is None:
            # Unparseable room — still include but flag it
            task = dict(task)  # shallow copy so we don't mutate caller's data
            task['estimated_distance'] = 99999.0
            task['route_note']         = f"⚠️ Room '{raw_room}' could not be parsed."
            task['parsed_room']        = raw_room
            skipped.append(task)
            continue

        # ── FIREWALL: skip tasks in the wrong hostel zone ──────────────────
        if target.block not in valid_blocks:
            continue   # silently filter — wrong zone for this worker

        # Compute cost
        cost = topological_distance(origin, target, staff_type)
        task = dict(task)   # shallow copy
        task['estimated_distance'] = round(cost, 1)
        task['parsed_room']        = f"{target.block}-{target.floor}{target.room_num:02d}"
        task['_target']            = target   # internal use for sorting

        urgency = (task.get('urgency') or '').strip().lower()

        if urgency in ('critical', 'high'):
            # ── URGENCY OVERRIDE: critical/high jumps the queue ────────────
            task['route_note'] = (
                f"🚨 PRIORITY — {urgency.upper()} urgency. "
                f"Distance: ~{task['estimated_distance']}m equivalent."
            )
            critical_tasks.append(task)
        else:
            task['route_note'] = (
                f"📍 {target.block}-Block, Floor {target.floor}. "
                f"Estimated walking cost: ~{task['estimated_distance']}m equivalent."
            )
            normal_tasks.append(task)

    # ── 4. Sort each group by physical distance ──────────────────────────────
    critical_tasks.sort(key=lambda t: t['estimated_distance'])
    normal_tasks.sort(key=lambda t:   t['estimated_distance'])
    skipped.sort(key=lambda t:        t.get('id', 0))

    # ── 5. Remove the internal _target key before returning ─────────────────
    def clean(task_list):
        out = []
        for t in task_list:
            t = dict(t)
            t.pop('_target', None)
            out.append(t)
        return out

    return clean(critical_tasks) + clean(normal_tasks) + clean(skipped)


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION 9 — FASTAPI ROUTER
#  Drop this into main.py:
#      from routing_service import router as routing_router
#      app.include_router(routing_router)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models

router = APIRouter(prefix="/maintenance", tags=["Maintenance Routing"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/next-task")
def get_next_task(
    current_room: str = Query(
        ...,
        description="Worker's current room, e.g. 'Q-415'",
        example="Q-415",
    ),
    staff_type: str = Query(
        ...,
        description="'MH' for Men's Hostel staff, 'WH' for Women's Hostel staff",
        example="MH",
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of tasks to return",
    ),
    db: Session = Depends(get_db),
):
    """
    Return the optimally-sorted list of pending maintenance tasks for a worker.

    Rules enforced:
    - Staff type must be 'MH' or 'WH'.
    - MH staff only see complaints in MH blocks (A-T except I/O).
    - WH staff only see complaints in WH blocks (A-J + S).
    - CRITICAL/HIGH urgency tasks always appear first regardless of distance.
    - Tasks within the same urgency tier are sorted by walking cost.
    """

    # ── Validate staff_type ──────────────────────────────────────────────────
    staff_type = staff_type.strip().upper()
    if staff_type not in (STAFF_MH, STAFF_WH):
        raise HTTPException(
            status_code=400,
            detail=f"staff_type must be 'MH' or 'WH', got '{staff_type}'."
        )

    # ── Validate current_room ────────────────────────────────────────────────
    origin = parse_room(current_room)
    if origin is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot parse room '{current_room}'. "
                "Use format Block-FloorRoom, e.g. 'Q-415'."
            )
        )

    valid_blocks = get_block_set(staff_type)
    if origin.block not in valid_blocks:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Block '{origin.block}' does not belong to {staff_type} zone. "
                "You are not authorised to be routed from this block."
            )
        )

    # ── Fetch all pending complaints from the database ───────────────────────
    raw_complaints = (
        db.query(models.Complaint)
        .filter(models.Complaint.status == "pending")
        .all()
    )

    # ── Convert SQLAlchemy objects to plain dicts ────────────────────────────
    # The routing algorithm works on plain dicts so it stays DB-agnostic.
    pending_tasks = []
    for c in raw_complaints:
        pending_tasks.append({
            "id":          c.id,
            "room_number": c.room_number if hasattr(c, 'room_number') else "",
            "description": c.description,
            "category":    c.category,
            "urgency":     c.urgency,
            "department":  c.department,
            "status":      c.status,
            "created_at":  str(c.created_at),
            "blockchain_hash": c.blockchain_hash,
        })

    # ── Run the routing algorithm ────────────────────────────────────────────
    try:
        sorted_tasks = calculate_optimal_route(
            current_location_str=current_room,
            pending_tasks=pending_tasks,
            staff_type=staff_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sorted_tasks = sorted_tasks[:limit]

    # ── Build response ───────────────────────────────────────────────────────
    if not sorted_tasks:
        return {
            "status":        "no_tasks",
            "message":       f"No pending tasks found in {staff_type} zone. ✅",
            "current_room":  current_room,
            "staff_type":    staff_type,
            "tasks":         [],
        }

    next_task = sorted_tasks[0]

    return {
        "status":          "ok",
        "current_room":    current_room,
        "staff_type":      staff_type,
        "total_tasks":     len(sorted_tasks),
        "next_task":       next_task,          # single most urgent / closest task
        "full_route":      sorted_tasks,       # entire sorted queue
    }


@router.get("/distance-check")
def distance_check(
    from_room: str = Query(..., example="Q-415"),
    to_room:   str = Query(..., example="R-302"),
    staff_type: str = Query(..., example="MH"),
):
    """
    Utility endpoint — calculate the routing cost between two rooms.
    Useful for debugging and testing the distance model.
    """
    staff_type = staff_type.strip().upper()
    if staff_type not in (STAFF_MH, STAFF_WH):
        raise HTTPException(status_code=400, detail="staff_type must be 'MH' or 'WH'.")

    origin = parse_room(from_room)
    target = parse_room(to_room)

    if origin is None:
        raise HTTPException(status_code=400, detail=f"Cannot parse from_room '{from_room}'.")
    if target is None:
        raise HTTPException(status_code=400, detail=f"Cannot parse to_room '{to_room}'.")

    matrix   = get_distance_matrix(staff_type)
    outside  = matrix.get(origin.block, {}).get(target.block, 99999.0)
    floor_c  = abs(origin.floor - target.floor) * FLOOR_WEIGHT
    room_c   = abs(origin.room_num - target.room_num) * ROOM_WEIGHT
    total    = outside + floor_c + room_c

    return {
        "from_room":             from_room,
        "to_room":               to_room,
        "staff_type":            staff_type,
        "outside_block_dist_m":  outside,
        "floor_delta":           abs(origin.floor - target.floor),
        "floor_cost":            floor_c,
        "room_delta":            abs(origin.room_num - target.room_num),
        "room_cost":             room_c,
        "total_cost_equiv_m":    round(total, 1),
        "formula": (
            f"{outside} + ({abs(origin.floor-target.floor)} × {FLOOR_WEIGHT}) "
            f"+ ({abs(origin.room_num-target.room_num)} × {ROOM_WEIGHT}) "
            f"= {round(total, 1)}"
        ),
    }
