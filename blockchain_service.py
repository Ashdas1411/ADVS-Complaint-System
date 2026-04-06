import hashlib

def generate_complaint_hash(description: str, user_id: int):
    data = f"{user_id}-{description}"
    return hashlib.sha256(data.encode()).hexdigest()
