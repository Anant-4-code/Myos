import json

def clean_text(text):
    if not text:
        return text
    # Remove the section headers
    text = text.replace("🔹 Section I: Data Structures-II", "")
    text = text.replace("🔹 Section II: DBMS-II", "")
    return text.strip()

with open("data/content.json", "r", encoding="utf-8") as f:
    content = json.load(f)

for node in content:
    if node.get("type") == "question":
        if "content" in node:
            node["content"] = clean_text(node["content"])
        if "code" in node:
            node["code"] = clean_text(node["code"])

with open("data/content.json", "w", encoding="utf-8") as f:
    json.dump(content, f, indent=2)

print("Cleaned content.json")
