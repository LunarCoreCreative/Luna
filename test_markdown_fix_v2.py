
import re

def preprocess_content(raw):
    if not raw:
        return ""
    
    processed = raw
    print(f"ORIGINAL:\n{processed}\n" + "-"*20)

    # 1. Fix severe concatenation (|| -> |\n|)
    processed = processed.replace('||', '|\n|') 
    
    # 2. Fix Table Start
    # Look for: (Text)(Header Row)(Newline)(Separator Row)
    # Header Row is |...| containing no newlines.
    # Separator Row is |...| containing only [-:|\s]
    
    # Regex Parts:
    # (?m)^ matches start of line (multiline mode) - handled by our structure?
    # Actually, after replace('||', '|\n|'), we have:
    # Text text| Header | Header |
    # |---|---|
    
    # So we match:
    # ([^\n]+?)          -> Group 1: Text before table (non-greedy)
    # (\|.+?\|)          -> Group 2: Header Row (starts with pipe, ends with pipe)
    # \n                 -> literal newline (inserted by step 1 or existing)
    # (\|[\s:\-\|]+\|)   -> Group 3: Separator Row (contains spaces, colons, dashes, pipes)
    
    pattern_start = r'([^\n]+?)(\|.+?\|)\n(\|[\s:\-\|]+\|)'
    
    processed = re.sub(pattern_start, r'\1\n\n\2\n\3', processed)

    # 3. Fix Table End
    # Look for: (Pipe)(Newline)(Text not starting with pipe)
    # (\|\s*)\n([^\n\|])
    pattern_end = r'(\|\s*)\n([^\n\|])'
    processed = re.sub(pattern_end, r'\1\n\n\2', processed)

    return processed

# Test case
broken_table = """Aqui está a tabela:| Critério | Luna | Ethan ||-------|------|------|| Funcionalidade | ✅ | ✅ || Performance | ✅ | ✅ || Manutenção | Média | Alta |
Conclusão final."""

result = preprocess_content(broken_table)
print(f"FINAL:\n{result}\n" + "-"*20)
