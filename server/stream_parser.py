import json
import re

class StreamStateParser:
    """
    State machine for parsing streaming content and robustly detecting tool calls.
    Tracks brace/tag depth to distinguish between displayable text and potential JSON/XML structure.
    """
    def __init__(self):
        self.buffer = ""
        self.state = "TEXT"  # TEXT, JSON, XML, POTENTIAL_XML, TOKEN
        self.brace_count = 0
        self.in_quote = False
        self.escape_next = False
        self.xml_tag_buffer = ""
        self.xml_depth = 0
        
    def ingest(self, chunk: str) -> list:
        """
        Ingests a text chunk and returns a list of events:
        - {"type": "content", "text": "..."} -> Safe to display
        - {"type": "tool_call_text", "json": {...}} -> Tool call detected
        - {"type": "tool_call_xml", "args": {...}} -> XML Tool call
        """
        events = []
        text_acc = ""  # Accumulate safe text
        
        for char in chunk:
            # 1. State: TEXT (Normal flow)
            if self.state == "TEXT":
                if char == '{':
                    # Flush accumulated text before state change
                    if text_acc:
                        events.append({"type": "content", "text": text_acc})
                        text_acc = ""
                        
                    # Start of potential JSON
                    self.state = "JSON"
                    self.brace_count = 1
                    self.buffer = char
                elif char == '<':
                    # Flush accumulated text before state change
                    if text_acc:
                        events.append({"type": "content", "text": text_acc})
                        text_acc = ""
                        
                    # Start of potential XML or Token
                    self.state = "POTENTIAL_XML" # Wait to see next char
                    self.buffer = char
                else:
                    # Safe text - accumulate
                    text_acc += char
            
            # 2. State: POTENTIAL_XML (Deciding between XML tag or just text like "x < y")
            elif self.state == "POTENTIAL_XML":
                self.buffer += char
                if char == '|': # <| token start
                   self.state = "TOKEN"
                elif char.isalpha() or char == '/': # <tag or </tag
                   self.state = "XML"
                   self.xml_depth = 1 if char != '/' else 0 # Simplification, refinement needed for robust XML
                else:
                   # False alarm, it was just text (e.g. "3 < 5")
                   self.state = "TEXT"
                   # The buffer content is now safe text, append to events directly (or accumulator?)
                   # Better to append to events to maintain order vs future text_acc
                   events.append({"type": "content", "text": self.buffer})
                   self.buffer = ""
                   # Note: We don't add to text_acc here to avoid complexity, 
                   # but subsequent TEXT chars will go to text_acc.

            # 3. State: TOKEN (Handling <| ... |>)
            elif self.state == "TOKEN":
                self.buffer += char
                if char == '>':
                     # Token closed. Check if it's a tool boundary
                     if "tool_calls" in self.buffer:
                         # Just swallow potential special tokens
                         self.buffer = ""
                         self.state = "TEXT"
                     else:
                         # Assume other tokens might be ignored or flushed
                         self.buffer = "" # Swallow for now to be safe
                         self.state = "TEXT"

            # 4. State: JSON (Tracking braces)
            elif self.state == "JSON":
                self.buffer += char
                
                # Quote handling
                if char == '"' and not self.escape_next:
                    self.in_quote = not self.in_quote
                
                if not self.escape_next and char == '\\':
                    self.escape_next = True
                else:
                    self.escape_next = False
                
                if not self.in_quote:
                    if char == '{':
                        self.brace_count += 1
                    elif char == '}':
                        self.brace_count -= 1
                        
                        if self.brace_count == 0:
                            # Potential full JSON object found
                            try:
                                # Quick validation
                                payload = json.loads(self.buffer)
                                # Is it a tool call?
                                if isinstance(payload, dict) and ("name" in payload or "tool" in str(payload)):
                                     events.append({"type": "tool_call_text", "json": payload})
                                     self.buffer = ""
                                     self.state = "TEXT"
                                elif isinstance(payload, list) and len(payload) > 0 and "name" in payload[0]:
                                     events.append({"type": "tool_call_text", "json": payload}) # List of tools
                                     self.buffer = ""
                                     self.state = "TEXT"
                                else:
                                     # Valid JSON but not a tool call? Treat as content.
                                     events.append({"type": "content", "text": self.buffer})
                                     self.buffer = ""
                                     self.state = "TEXT"
                            except:
                                # Not valid JSON yet (maybe trailing commas or something), keep buffering? 
                                # Or if valid failed, maybe it was just text "{a} b".
                                # If brace_count is 0 but json.loads failed, it's likely just text/code.
                                events.append({"type": "content", "text": self.buffer})
                                self.buffer = ""
                                self.state = "TEXT"
            
            # 5. State: XML (Simple tag tracking for <tool_code>)
            elif self.state == "XML":
                self.buffer += char
                if char == '>':
                    # Determine if it's a closing tag for a known tool
                    # Safety valve for huge buffers
                    if len(self.buffer) > 20000: 
                        events.append({"type": "content", "text": self.buffer})
                        self.buffer = ""
                        self.state = "TEXT"
                    
                    # Check if buffer ends with a known closing tag
                    known_tools = ["edit_artifact", "create_artifact", "get_artifact", "web_search", "run_command"]
                    found_tool = False
                    for kt in known_tools:
                        if f"</{kt}>" in self.buffer:
                            # Try to extract
                            found_tool = True
                            # Not parsing here fully to avoid complexity - Agent handles XML parsing via regex on buffer
                            # But if the Agent expects 'tool_call_xml', we should emit it?
                            # Current implementation in agent.py relies on 'content' events or 'tool_call_text'.
                            # Wait, previous agent.py logic had XML regexes OUTSIDE the parser loop?
                            # No, the new parser logic replaced the loop.
                            # So the parser MUST yield something for XML otherwise it's lost?
                            # In my previous agent.py replacement, I did NOT see 'tool_call_xml' handling in the consumer loop!
                            # I only saw 'tool_call_text' and 'content'.
                            # Let's check agent.py again.
                            
                            # If agent.py doesn't handle 'tool_call_xml', then we should probably 
                            # flush it as text (so agent's legacy XML regex in 'content' handler might catch it? 
                            # ... wait, I removed legacy regex!)
                            
                            # CRITICAL: I removed the XML regex from agent.py.
                            # So StreamStateParser MUST handle XML and emit 'tool_call_text' (as JSON) or 'tool_call_xml'.
                            # But agent.py consumer only has:
                            # elif event["type"] == "tool_call_text": ...
                            
                            # So I need to parse XML here and emit 'tool_call_text' with JSON payload?
                            # OR add 'tool_call_xml' handler to agent.py.
                            # Adding handler to agent.py is hard now (more edits).
                            # Converting XML to JSON here is cleaner.
                            
                            try:
                                # regex on buffer
                                res = re.search(f"<{kt}>(.*?)</{kt}>", self.buffer, re.DOTALL)
                                if res:
                                    inner_xml = res.group(1)
                                    # Basic XML to Dict parsing
                                    args = {}
                                    child_tags = re.findall(r'<([a-zA-Z0-9_]+)>([\s\S]*?)</\1>', inner_xml)
                                    for tag, val in child_tags:
                                        if tag == "changes":
                                            changes_list = []
                                            sr_matches = re.findall(r'<search>([\s\S]*?)</search>\s*<replace>([\s\S]*?)</replace>', val)
                                            for s, r in sr_matches:
                                                changes_list.append({"search": s.strip(), "replace": r.strip()})
                                            args[tag] = changes_list
                                        else:
                                            args[tag] = val.strip()
                                            
                                    payload = {"name": kt, "arguments": args}
                                    events.append({"type": "tool_call_text", "json": payload})
                                    self.buffer = ""
                                    self.state = "TEXT"
                                    break
                            except:
                                pass
                            
                    if not found_tool and self.state == "XML":
                         # Still in XML, continue buffering
                         pass

        # End of loop: flush text_acc
        if text_acc:
            events.append({"type": "content", "text": text_acc})
            
        return events
    
    def flush(self) -> list:
        """Return any remaining buffer as content."""
        events = []
        if self.buffer:
            events.append({"type": "content", "text": self.buffer})
        self.buffer = ""
        self.state = "TEXT"
        return events
