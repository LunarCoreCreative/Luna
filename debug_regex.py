
import re

def test_regex():
    # Example text from screenshot approximation
    text = """< | tool_calls_begin | >< | tool_call_begin | 
>list_transactions< | tool_sep | >{}< | tool_call_
end | >< | tool_calls_end | >"""
    
    print(f"Original: {repr(text)}")
    
    # Javascript regex approximation in Python
    # /<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/g
    
    # 1. Main Token Regex
    pattern1 = r'<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>'
    cleaned = re.sub(pattern1, '[MATCHED_1]', text)
    
    # 2. Tool Sep
    pattern2 = r'<\s*\|\s*tool_sep\s*\|\s*>'
    cleaned = re.sub(pattern2, '[MATCHED_2]', cleaned)
    
    print(f"\nResult 1: {repr(cleaned)}")
    
    # Check if lines break matching
    # The screenshot had newlines.
    # Note: "." in regex usually doesn't match newline. \s matches newline.
    # But my regex uses \s*.
    
    # Let's try to match the "split" one: < | tool_call_begin | \n >
    text_split = "< | tool_call_begin | \n >"
    cleaned_split = re.sub(pattern1, '[MATCHED_SPLIT]', text_split)
    print(f"\nSplit Test: {repr(text_split)} -> {repr(cleaned_split)}")
    
    # Case with HTML entities?
    text_html = "&lt; | tool_calls_begin | &gt;"
    cleaned_html = re.sub(pattern1, '[MATCHED_HTML]', text_html)
    print(f"\nHTML Test: {repr(text_html)} -> {repr(cleaned_html)}")

if __name__ == "__main__":
    test_regex()
