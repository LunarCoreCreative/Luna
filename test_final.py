import json
import re

def test_regex():
    # Tokens seen in the screenshot or expected variants
    test_tokens = [
        "< | tool_calls_begin | >",
        "<| tool_calls_begin |>",
        "<|tool_calls_begin|>",
        "<| tool_calls_begin | >",
        "< | tool_calls_end | >",
        "< / | tool_calls_begin | >", # Variant attempt
        "<  |  tool_calls_begin  |  >"
    ]
    
    # regex from agent.py:
    # chunk_text = re.sub(r'<\|.*?\|>|<\s*/?\|?\s*tool_calls_.*?\|?\s*>', '', chunk_text, flags=re.IGNORECASE)
    # chunk_text = re.sub(r'<\s*\|.*?\|\s*>', '', chunk_text)
    
    def filter_text(text):
        text = re.sub(r'<\|.*?\|>|<\s*/?\|?\s*tool_calls_.*?\|?\s*>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<\s*\|.*?\|\s*>', '', text)
        return text

    print("Testing Regex Filtering:")
    all_passed = True
    for token in test_tokens:
        result = filter_text(token)
        if result.strip() == "":
            print(f"[OK] Filtered: '{token}'")
        else:
            print(f"[FAIL] Not filtered: '{token}' -> Result: '{result}'")
            all_passed = False
    return all_passed

def test_safe_print():
    args = {"title": "O Dragão de Safira", "content": "Era uma vez..."}
    print("\nTesting safe print manually:")
    try:
        safe_title = args['title'].encode('ascii', 'replace').decode('ascii')
        print(f"[OK] Safe title: {safe_title}")
        safe_args = json.dumps(args, ensure_ascii=True)
        print(f"[OK] Safe args: {safe_args}")
    except Exception as e:
        print(f"[FAIL] Error in safe print: {e}")
        return False
    return True

if __name__ == "__main__":
    r1 = test_regex()
    r2 = test_safe_print()
    if r1 and r2:
        print("\nALL TESTS PASSED!")
    else:
        print("\nSOME TESTS FAILED!")
        exit(1)
