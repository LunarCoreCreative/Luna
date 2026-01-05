
import re

def original_handle_edit(content, search_block, replace_block):
    # Mimics the current simplified logic in agent.py
    new_content = content
    content_norm = new_content.replace("\r\n", "\n")
    search_norm = search_block.replace("\r\n", "\n")
    
    if search_norm in content_norm:
        return content_norm.replace(search_norm, replace_block)
    
    if search_norm.strip() in content_norm:
        return content_norm.replace(search_norm.strip(), replace_block)
        
    # The current fallback implementation in agent.py (simplified)
    # It tries to find the first line
    search_lines = search_norm.strip().split('\n')
    content_lines = content_norm.split('\n')
    
    if len(search_lines) > 0:
        first_line_clean = search_lines[0].strip()
        candidates = [i for i, line in enumerate(content_lines) if first_line_clean in line]
        
        for start_idx in candidates:
            match = True
            for offset, s_line in enumerate(search_lines):
                if start_idx + offset >= len(content_lines):
                    match = False
                    break
                # This is the strict check in current code: s_line.strip() must be IN content_line
                if s_line.strip() not in content_lines[start_idx + offset]:
                    match = False
                    break
            if match:
                end_matched_index = start_idx + len(search_lines)
                original_block_to_replace = "\n".join(content_lines[start_idx:end_matched_index])
                return content_norm.replace(original_block_to_replace, replace_block)

    return None

def new_structural_edit(content, search_block, replace_block):
    content_norm = content.replace("\r\n", "\n")
    search_norm = search_block.replace("\r\n", "\n")
    
    # 0. Precise Match
    if search_norm in content_norm:
         return content_norm.replace(search_norm, replace_block)

    # 1. Structural Match (Indentation/Whitespace agnostic)
    content_lines = content_norm.split('\n')
    
    # Map non-empty lines to their original indices
    # (index_in_original_list, content_of_line_stripped)
    non_empty_map = []
    for i, line in enumerate(content_lines):
        if line.strip():
            non_empty_map.append((i, line.strip()))
            
    search_lines_stripped = [line.strip() for line in search_norm.split('\n') if line.strip()]
    
    if not search_lines_stripped:
        return None # Empty search block??

    # List of stripped content lines
    content_stripped = [x[1] for x in non_empty_map]
    
    # Search for subsequence
    n = len(search_lines_stripped)
    m = len(content_stripped)
    
    if n == 0: return None
    
    found_start_idx = -1
    
    for i in range(m - n + 1):
        if content_stripped[i : i + n] == search_lines_stripped:
            found_start_idx = i
            break
            
    if found_start_idx != -1:
        # Found match in stripped lines!
        # Map back to original lines
        start_mapping = non_empty_map[found_start_idx]     # (original_idx, content)
        end_mapping = non_empty_map[found_start_idx + n - 1] # (original_idx, content)
        
        orig_start_line = start_mapping[0]
        orig_end_line = end_mapping[0]
        
        # Replace the range in original lines
        # Note: This blindly replaces everything between the first and last matched non-empty line
        # including any intermediate empty lines that might differ. This is usually what we want.
        
        new_lines = content_lines[:orig_start_line] + [replace_block] + content_lines[orig_end_line+1:]
        return "\n".join(new_lines)
        
    return None

# TEST CASES

code_sample = """
def dragon_color():
    # Helper function
    if dragon.type == 'white':
        return 'white'
        
    return 'unknown'
"""

# Case 1: Exact match (should work in both)
search_1 = """    if dragon.type == 'white':
        return 'white'"""
replace_1 = "    if dragon.type == 'white':\n        return 'blue'"

# Case 2: Indentation mismatch (Agent uses 2 spaces instead of 4)
search_2 = """  if dragon.type == 'white':
    return 'white'"""
replace_2 = "REPLACED"

# Case 3: Missing empty line in search
code_with_gap = """
def foo():

    print("bar")
"""
search_3 = "def foo():\n    print(\"bar\")"
replace_3 = "REPLACED_GAP"

print("--- TEST 1: Exact Match ---")
res = original_handle_edit(code_sample, search_1, replace_1)
print(f"Original: {'SUCCESS' if res else 'FAIL'}")
res2 = new_structural_edit(code_sample, search_1, replace_1)
print(f"New: {'SUCCESS' if res2 else 'FAIL'}")

print("\n--- TEST 2: Indentation Mismatch ---")
res = original_handle_edit(code_sample, search_2, replace_2)
print(f"Original: {'SUCCESS' if res else 'FAIL'}")
res2 = new_structural_edit(code_sample, search_2, replace_2)
print(f"New: {'SUCCESS' if res2 else 'FAIL'}")

print("\n--- TEST 3: Missing Empty Line ---")
res = original_handle_edit(code_with_gap, search_3, replace_3)
print(f"Original: {'SUCCESS' if res else 'FAIL'}") 
# Note: Original fails because it strips lines but matches line-by-line against original content structure?
# Actually original `search_norm.strip().split('\n')` vs `content_lines`.
# content_lines has empty line. search_lines doesn't.
# line 0: "def foo():" matches.
# line 1 (search): "print" vs line 1 (content): "" -> mismatch.
res2 = new_structural_edit(code_with_gap, search_3, replace_3)
print(f"New: {'SUCCESS' if res2 else 'FAIL'}")
