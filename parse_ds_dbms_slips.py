import json
import re
import uuid

def generate_id():
    return f"node-{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:6]}"

with open("temp_ds_dbms_slips.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Split slips by "🔴 SLIP "
slips_raw = re.split(r'🔴\s+SLIP\s+(\d+.*)', text)
if len(slips_raw) > 1 and not slips_raw[0].strip():
    slips_raw.pop(0)

slips_data = []

for i in range(0, len(slips_raw), 2):
    slip_num = slips_raw[i].strip()
    slip_content = slips_raw[i+1].strip()
    
    parts_raw = re.split(r'✅\s+', slip_content)
    if parts_raw and not parts_raw[0].strip():
        parts_raw.pop(0)
    elif parts_raw and 'Q1' not in parts_raw[0] and 'Q2' not in parts_raw[0]:
        parts_raw.pop(0)
        
    questions_data = []
    
    for part in parts_raw:
        if not part.strip(): continue
        
        first_newline = part.find('\n')
        if first_newline == -1:
            q_title = part.strip()
            q_body = ""
        else:
            q_title = part[:first_newline].strip()
            q_body = part[first_newline:].strip()
            
        q_title = re.sub(r'(?:FULL QUESTION:?|:?)$', '', q_title).strip()
        q_title = q_title.replace(")", "")
        
        code_split = re.search(r'(📌.*?\n|CREATE OR REPLACE.*?\n)', q_body)
        if code_split:
            idx = code_split.start()
            question_text = q_body[:idx].strip()
            code_text = q_body[idx:].strip()
            
            if code_text.startswith("📌 CODE:") or code_text.startswith("📌 CODE (Correct & Clean)"):
                first_nl = code_text.find('\n')
                if first_nl != -1:
                    code_text = code_text[first_nl:].strip()
            elif code_text.startswith("📌 SQL:"):
                first_nl = code_text.find('\n')
                if first_nl != -1:
                    code_text = code_text[first_nl:].strip()
        else:
            code_split = re.search(r'(#include<|def |class |import )', q_body)
            if code_split:
                idx = code_split.start()
                question_text = q_body[:idx].strip()
                code_text = q_body[idx:].strip()
            else:
                question_text = q_body
                code_text = ""
                
        lang = "python"
        if "#include" in code_text:
            lang = "c"
        elif "CREATE OR" in code_text or "SELECT " in code_text or "plpgsql" in code_text:
            lang = "sql"
            
        questions_data.append({
            "name": q_title,
            "question": question_text,
            "code": code_text,
            "language": lang
        })
        
    slips_data.append({
        "name": f"Slip {slip_num}",
        "questions": questions_data
    })

input_file = "data/content.json"
with open(input_file, "r", encoding="utf-8") as f:
    content = json.load(f)

main_folder_name = "DS and DBMS Slips"
main_folder_id = None
for node in content:
    if node.get("name") == main_folder_name and node.get("type") == "folder":
        main_folder_id = node["id"]
        break

if not main_folder_id:
    main_folder_id = generate_id()
    content.append({
        "id": main_folder_id,
        "parentId": None,
        "type": "folder",
        "name": main_folder_name
    })

def get_descendants(parent_id, all_nodes):
    desc = []
    for n in all_nodes:
        if n.get("parentId") == parent_id:
            desc.append(n["id"])
            desc.extend(get_descendants(n["id"], all_nodes))
    return desc

ids_to_remove = set(get_descendants(main_folder_id, content))
content = [n for n in content if n["id"] not in ids_to_remove]

for slip in slips_data:
    slip_id = generate_id()
    content.append({
        "id": slip_id,
        "parentId": main_folder_id,
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
            "language": q["language"]
        })

with open(input_file, "w", encoding="utf-8") as f:
    json.dump(content, f, indent=2)

print(f"Successfully processed {len(slips_data)} slips and added them to content.json.")
