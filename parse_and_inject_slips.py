import json
import re
import uuid

def generate_id():
    return f"node-{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:6]}"

with open("temp_slips.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Regular expression to split slips
slips_raw = re.split(r'✅\s+(Slip\s+\d+.*)', text)
if len(slips_raw) > 1 and not slips_raw[0].strip():
    slips_raw.pop(0)

slips_data = []
for i in range(0, len(slips_raw), 2):
    slip_name = slips_raw[i].strip()
    slip_content = slips_raw[i+1].strip()
    
    # Clean up name if it has notes
    slip_name_clean = slip_name.split('(')[0].strip()
    
    # Split questions
    questions_raw = re.split(r'🔹\s+', slip_content)
    if questions_raw and not questions_raw[0].strip():
        questions_raw.pop(0)
        
    questions_data = []
    for q_raw in questions_raw:
        if not q_raw.strip(): continue
        
        m = re.match(r'(Q\d+(?:\s+\([^\)]+\))?)\s*\n(.*)', q_raw, flags=re.DOTALL)
        if not m:
            continue
        q_name = m.group(1).strip()
        q_body = m.group(2).strip()
        
        q_part_match = re.search(r'QUESTION:\s*(.*?)(?:CODE:\s*(.*))?$', q_body, flags=re.DOTALL)
        if q_part_match:
            question_text = q_part_match.group(1).strip()
            code_text = q_part_match.group(2)
            code_text = code_text.strip() if code_text else ""
            
            questions_data.append({
                "name": q_name,
                "question": question_text,
                "code": code_text
            })
            
    slips_data.append({
        "name": slip_name_clean,
        "questions": questions_data
    })

# Load the current content.json
input_file = "data/content.json"
with open(input_file, "r", encoding="utf-8") as f:
    content = json.load(f)

# Find the Python Slip folder
python_slip_id = None
for node in content:
    if node.get("name") == "Python Slip" and node.get("type") == "folder":
        python_slip_id = node["id"]
        break

if not python_slip_id:
    # Append the Python Slip folder
    python_slip_id = generate_id()
    content.append({
        "id": python_slip_id,
        "parentId": None,
        "type": "folder",
        "name": "Python Slip"
    })

# Collect IDs of existing slips under Python Slip to clear them
def get_descendants(parent_id, all_nodes):
    desc = []
    for n in all_nodes:
        if n.get("parentId") == parent_id:
            desc.append(n["id"])
            desc.extend(get_descendants(n["id"], all_nodes))
    return desc

ids_to_remove = set(get_descendants(python_slip_id, content))
# Remove duplicates and old slips
content = [n for n in content if n["id"] not in ids_to_remove]

# Insert the parsed slips
for slip in slips_data:
    slip_id = generate_id()
    content.append({
        "id": slip_id,
        "parentId": python_slip_id,
        "type": "folder",
        "name": slip["name"]
    })
    
    for q in slip["questions"]:
        q_id = generate_id()
        content.append({
            "id": q_id,
            "parentId": slip_id,
            "type": "question",
            "name": q["name"],
            "content": q["question"],
            "code": q["code"],
            "language": "python"
        })

# Write the updated content
with open(input_file, "w", encoding="utf-8") as f:
    json.dump(content, f, indent=2)

print(f"Successfully processed {len(slips_data)} slips and added them to content.json.")
