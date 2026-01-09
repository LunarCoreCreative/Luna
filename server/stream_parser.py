import json
import re

class StreamStateParser:
    """
    State machine for parsing streaming content and robustly detecting tool calls.
    Tracks brace/tag depth to distinguish between displayable text and potential JSON/XML structure.
    Also handles Qwen/DeepSeek style token-delimited tool calls.
    """
    def __init__(self):
        self.buffer = ""
        self.state = "TEXT"  # TEXT, JSON, XML, POTENTIAL_XML, TOKEN, QWEN_NAME, QWEN_ARGS
        self.previous_state = "TEXT" # Track context before entering TOKEN
        self.brace_count = 0
        self.in_quote = False
        self.escape_next = False
        self.xml_tag_buffer = ""
        self.xml_depth = 0
        
        # New Qwen fields
        self.qwen_buffer = ""
        self.qwen_name = ""
        self.pending_token_start = False
        self.token_buffer = ""

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
                    self.previous_state = "TEXT" # Came from Text
                    self.buffer = char
                else:
                    # Safe text - accumulate
                    text_acc += char
            
            # 2. State: POTENTIAL_XML (Deciding between XML tag or just text like "x < y")
            elif self.state == "POTENTIAL_XML":
                self.buffer += char
                if char.isspace():
                    pass # Keep buffering any whitespace
                elif char == '|': # <| or < | token start
                   self.state = "TOKEN"
                elif char.isalpha() or char == '/': # <tag or </tag
                   self.state = "XML"
                   self.xml_depth = 1 if char != '/' else 0
                else:
                   # False alarm, it was just text (e.g. "3 < 5")
                   self.state = "TEXT"
                   events.append({"type": "content", "text": self.buffer})
                   self.buffer = ""
            
            # 3. State: TOKEN (Handling <| ... |>)
            elif self.state == "TOKEN":
                self.buffer += char
                if char == '>':
                     # Token closed. Check content
                     # Normalize: remove ALL whitespace and extra >
                     normalized = re.sub(r'\s+', '', self.buffer).replace(">", "")
                     self.buffer = "" # Swallow tokens by default
                     
                     if "tool_calls_begin" in normalized:
                         self.state = "TEXT" # Just swallow the marker, stay in text until call_begin
                     elif "tool_calls_end" in normalized:
                         self.state = "TEXT" # Swallow end marker
                     elif "tool_call_begin" in normalized:
                         self.state = "QWEN_NAME"
                         self.qwen_buffer = ""
                     elif "tool_sep" in normalized:
                         if self.previous_state == "QWEN_NAME":
                             self.qwen_name = self.qwen_buffer.strip()
                             # Sanitize name (remove non-alphanumeric if needed)
                             self.qwen_name = re.sub(r'[^a-zA-Z0-9_]', '', self.qwen_name)
                             self.state = "QWEN_ARGS"
                             self.qwen_buffer = ""
                         else:
                             # Unexpected sep? Just ignore or return to text
                             self.state = "TEXT"
                     elif "tool_call_end" in normalized:
                         if self.previous_state == "QWEN_ARGS":
                             args_str = self.qwen_buffer.strip()
                             try:
                                 args = json.loads(args_str)
                             except:
                                 # Try to fix common JSON errors if needed, or fallback
                                 args = args_str 
                             
                             events.append({
                                "type": "tool_call_text",
                                "json": {"name": self.qwen_name, "arguments": args}
                             })
                         self.state = "TEXT"
                     else:
                         # Unknown token, might be <|endoftext|> etc. Swallow for safety in tool context
                         self.state = "TEXT"

            # 3.5 Qwen States
            elif self.state == "QWEN_NAME":
                if char == '<':
                    self.pending_token_start = True
                    self.token_buffer = char
                elif self.pending_token_start:
                     self.token_buffer += char
                     if char == '|' or (char.isspace() and '|' not in self.token_buffer):
                         if '|' in self.token_buffer:
                             self.previous_state = self.state # Remember we were in NAME
                             self.state = "TOKEN"
                             self.buffer = self.token_buffer
                             self.pending_token_start = False
                     else:
                         # Failed token start
                         self.qwen_buffer += self.token_buffer
                         self.token_buffer = ""
                         self.pending_token_start = False
                else: 
                     self.qwen_buffer += char

            elif self.state == "QWEN_ARGS":
                # Same logic: capture until <|tool_call_end|>
                if char == '<':
                    self.pending_token_start = True
                    self.token_buffer = char
                elif self.pending_token_start:
                     self.token_buffer += char
                     
                     # Simple heuristics to detect token start
                     if '|' in self.token_buffer:
                         self.previous_state = self.state # Remember we were in ARGS
                         self.state = "TOKEN"
                         self.buffer = self.token_buffer
                         self.pending_token_start = False
                     elif len(self.token_buffer) > 10 and not self.token_buffer.strip().startswith('<'): 
                         # Buffer got too long without pipe -> not a token
                         self.qwen_buffer += self.token_buffer
                         self.token_buffer = ""
                         self.pending_token_start = False
                else:
                    self.qwen_buffer += char

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
                                payload = json.loads(self.buffer)
                                if isinstance(payload, dict) and ("name" in payload or "tool" in str(payload)):
                                     events.append({"type": "tool_call_text", "json": payload})
                                     self.buffer = ""
                                     self.state = "TEXT"
                                elif isinstance(payload, list) and len(payload) > 0 and "name" in payload[0]:
                                     events.append({"type": "tool_call_text", "json": payload})
                                     self.buffer = ""
                                     self.state = "TEXT"
                                else:
                                     events.append({"type": "content", "text": self.buffer})
                                     self.buffer = ""
                                     self.state = "TEXT"
                            except:
                                events.append({"type": "content", "text": self.buffer})
                                self.buffer = ""
                                self.state = "TEXT"
            
            # 5. State: XML
            elif self.state == "XML":
                self.buffer += char
                if char == '>':
                    # Determine if it's a closing tag for a known tool
                    if len(self.buffer) > 20000: 
                        events.append({"type": "content", "text": self.buffer})
                        self.buffer = ""
                        self.state = "TEXT"
                    
                    known_tools = ["edit_artifact", "create_artifact", "get_artifact", "web_search", "run_command"]
                    found_tool = False
                    for kt in known_tools:
                        if f"</{kt}>" in self.buffer:
                            found_tool = True
                            try:
                                res = re.search(f"<{kt}>(.*?)</{kt}>", self.buffer, re.DOTALL)
                                if res:
                                    inner_xml = res.group(1)
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
