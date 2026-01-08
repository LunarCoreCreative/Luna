import re

def fix_markdown(text: str) -> str:
    """
    Fixes common markdown formatting issues produced by LLMs.
    1. Removes spaces inside bold/italic markers: '** text **' -> '**text**'
    2. Fixes cases where bold symbols are separated from text: '** text' -> '**text'
    3. Handles aggressive edge cases for streaming chunks.
    """
    if not text:
        return text
        
    # 1. Bold: ** text ** -> **text**
    text = re.sub(r'\*\*\s+(.*?)\s+\*\*', r'**\1**', text)
    
    # 2. Italic: * text * -> *text*
    # Using negative lookbehind/lookahead to avoid matching bold **
    text = re.sub(r'(?<!\*)\*\s+([^*]+?)\s+\*(?!\*)', r'*\1*', text)
    
    # 3. Leading bold: '** text' -> '**text'
    text = re.sub(r'\*\*\s+', r'**', text)
    
    # 4. Trailing bold: 'text **' -> 'text**'
    text = re.sub(r'\s+\*\*', r'**', text)
    
    # 5. Case specific: "1. ** Bloco**" -> "1. **Bloco**"
    text = re.sub(r'(\d+\.\s+)\*\*\s+', r'\1**', text)
    
    return text
