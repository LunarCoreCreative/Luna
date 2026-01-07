
import re

def preprocess_content(raw):
    if not raw:
        return ""
    
    processed = raw
    print(f"ORIGINAL:\n{processed}\n" + "-"*20)

    # 1. Fix severe concatenation (|| -> |\n|)
    # This acts as the primary splitter for the single-line table issue
    processed = processed.replace('||', '|\n|') 

    # 2. Add newline before table if missing
    # OLD FAIL: re.sub(r'([^\n])(\s*\|.*\|)', r'\1\n\n\2', processed)
    # NEW IDEA: Only match if the pipe is the *start* of a line-like structure
    # But for the "single line" case, processed.replace('||', '|\n|') already introduced newlines!
    # So we just need to ensure the *first* pipe has a newline before it if it follows text.
    
    # regex explanation:
    # ([^\n\|])       -> Character that is NOT a newline and NOT a pipe (end of previous text)
    # (\n*)           -> Optional existing newlines (we want to force at least 2)
    # (\|.*\|)        -> The table row start
    
    # We shouldn't match just any pipe, but a pipe that starts a row.
    # After step 1, we have:
    # ... Text |\n| Header | ...
    
    # Let's handle the initial table start specifically.
    # Look for: Not-Newline followed immediately by Pipe-Something-Pipe
    processed = re.sub(r'([^\n])([ \t]*\|.+?\|)', r'\1\n\n\2', processed, count=1) 
    # Used count=1 to try and only hit the first one, but that's risky if multiple tables.
    # Better: Identify table start by looking for the header row pattern if possible, 
    # OR rely on the fact that we fixed the internal rows.
    
    # Let's try a safer pattern: 
    # Break before a pipe IF it is preceded by non-pipe/non-newline char.
    # ensure we don't break existing good tables 
    
    return processed

# Test case REFINED
broken_table = """Aqui está a tabela:| Critério | Luna | Ethan ||-------|------|------|| Funcionalidade | ✅ | ✅ || Performance | ✅ | ✅ || Manutenção | Média | Alta |
Conclusão final."""

# Manually running what happens in Step 1
step1 = broken_table.replace('||', '|\n|')
print(f"AFTER STEP 1:\n{step1}\n" + "-"*20)

# After step 1:
# Aqui está a tabela:| Critério | Luna | Mestre |
# |-------|------|------|
# | Funcionalidade | ✅ | ✅ |
# | Performance | ✅ | ✅ |
# | Manutenção | Média | Alta |
# Conclusão final.

# Now we see "Aqui está a tabela:| Critério..." -> NO NEWLINE.
# We need to fix that one.
# Pattern: (char not \n) followed by (|)
step2 = re.sub(r'([^\n])(\s*\|)', r'\1\n\n\2', step1)
print(f"AFTER STEP 2:\n{step2}\n" + "-"*20)

# Now check if we broke the end
# "Alta |\nConclusão final." -> Ideally we want "Alta |\n\nConclusão final."
step3 = re.sub(r'(\|\s*)\n([^\n\|])', r'\1\n\n\2', step2)

print(f"AFTER STEP 3 (FINAL):\n{step3}\n" + "-"*20)
