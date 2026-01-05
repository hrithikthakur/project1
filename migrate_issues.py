import json
from pathlib import Path

# Paths
data_file = Path("data/mock_world.json")

if not data_file.exists():
    print("File not found")
    exit(1)

with open(data_file, "r") as f:
    world = json.load(f)

# 1. Update risk statuses: active -> open
for risk in world.get("risks", []):
    if risk.get("status") == "active":
        risk["status"] = "open"
    elif risk.get("status") in ["mitigated", "resolved"]:
        risk["status"] = "closed"

# 2. Convert issues to materialised risks
issues = world.get("issues", [])
new_risks = []
for issue in issues:
    issue_id = issue.get("id")
    risk_id = f"risk_from_{issue_id}"
    
    # Map issue status to risk status
    # issue status: open, in_progress, resolved, closed
    # risk status: open, accepted, mitigating, materialised, closed
    status = "materialised"
    if issue.get("status") in ["resolved", "closed"]:
        status = "closed"
    elif issue.get("status") == "in_progress":
        status = "mitigating"
        
    risk = {
        "id": risk_id,
        "title": issue.get("title", "Migrated Issue"),
        "description": issue.get("description", ""),
        "severity": issue.get("priority", "medium"),
        "status": status,
        "probability": 1.0,
        "impact": {
            "description": issue.get("impact_description"),
            "original_issue_type": issue.get("type")
        },
        "affected_items": [issue.get("work_item_id")] if issue.get("work_item_id") else [],
        "detected_at": issue.get("created_at"),
        "next_date": None
    }
    
    # Add optional fields
    if issue.get("dependency_id"):
        risk["dependency_id"] = issue.get("dependency_id")
    if issue.get("risk_id"):
        risk["linked_risk_id"] = issue.get("risk_id")
        
    new_risks.append(risk)

# Add new risks to world
if "risks" not in world:
    world["risks"] = []
world["risks"].extend(new_risks)

# 3. Remove issues key
if "issues" in world:
    del world["issues"]

# Save back
with open(data_file, "w") as f:
    json.dump(world, f, indent=2)

print("Migration completed successfully")


