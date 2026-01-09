from server.stream_parser import StreamStateParser
import json

def test_parser():
    parser = StreamStateParser()
    
    # Text imitating the screenshot failure
    # Note: spaces around pipes
    text = "Deixe-me verificar: < | tool_calls_begin | >< | tool_call_begin | >list_transactions< | tool_sep | >{\"limit\": 50}< | tool_call_end | >< | tool_calls_end | >"
    
    print(f"Input: {text}")
    print("-" * 20)
    
    events = parser.ingest(text)
    
    for e in events:
        print(f"Event: {e}")

    # Also test chunked input
    print("\n\n--- Chunked Test ---")
    parser2 = StreamStateParser()
    chunks = ["Deixe-me ", "verificar: < | tool_", "calls_begin | >", "< | tool_call_", "begin | >"]
    for c in chunks:
        evs = parser2.ingest(c)
        for e in evs:
            print(f"Chunk Event: {e}")

if __name__ == "__main__":
    test_parser()
