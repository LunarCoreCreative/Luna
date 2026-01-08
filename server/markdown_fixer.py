import re

def fix_markdown(text: str) -> str:
    """
    Fixes common markdown formatting issues produced by LLMs.
    
    Handles:
    1. Spaces inside bold/italic markers: '** text **' -> '**text**'
    2. Missing space BEFORE bold: 'Estou**ótimo**' -> 'Estou **ótimo**'
    3. Missing space AFTER bold: '**ótimo**obrigado' -> '**ótimo** obrigado'
    4. Punctuation spacing issues
    5. Emoji spacing
    """
    if not text:
        return text
    
    # =========================================================================
    # 1. FIX SPACES INSIDE MARKERS (excess spaces)
    # =========================================================================
    
    # Bold: ** text ** -> **text**
    text = re.sub(r'\*\*\s+(.*?)\s+\*\*', r'**\1**', text)
    
    # Italic: * text * -> *text* (careful not to match **)
    text = re.sub(r'(?<!\*)\*\s+([^*]+?)\s+\*(?!\*)', r'*\1*', text)
    
    # Leading space after **: '** text' -> '**text'
    text = re.sub(r'\*\*\s+', r'**', text)
    
    # Trailing space before **: 'text **' -> 'text**'
    text = re.sub(r'\s+\*\*', r'**', text)
    
    # =========================================================================
    # 2. FIX MISSING SPACE BEFORE BOLD (word**bold** -> word **bold**)
    # =========================================================================
    
    # Pattern: lowercase/uppercase letter directly before **
    # Example: "Estou**perfeitamente**" -> "Estou **perfeitamente**"
    text = re.sub(r'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])\*\*([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'\1 **\2', text)
    
    # =========================================================================
    # 3. FIX MISSING SPACE AFTER BOLD (**bold**word -> **bold** word)
    # =========================================================================
    
    # Pattern: ** followed directly by lowercase/uppercase letter (not punctuation)
    # Example: "**ótimo**obrigado" -> "**ótimo** obrigado"
    text = re.sub(r'\*\*([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'** \1', text)
    
    # Same for closing bold followed by word
    text = re.sub(r'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])\*\*([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'\1**\2', text)
    
    # After ** closing, if followed by letter (not punctuation), add space
    # But only if not already spaced
    text = re.sub(r'\*\*([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'** \1', text)
    
    # =========================================================================
    # 4. FIX DOUBLE SPACES CREATED BY ABOVE RULES
    # =========================================================================
    text = re.sub(r'  +', ' ', text)
    
    # =========================================================================
    # 5. FIX PUNCTUATION SPACING
    # =========================================================================
    
    # Missing space after period/question/exclamation followed by letter
    text = re.sub(r'([.!?])([A-ZÁÉÍÓÚÇ])', r'\1 \2', text)
    
    # Missing space before emoji (common issue)
    text = re.sub(r'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ!?.])([\U0001F300-\U0001F9FF])', r'\1 \2', text)
    
    # Missing space after emoji
    text = re.sub(r'([\U0001F300-\U0001F9FF])([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'\1 \2', text)
    
    # =========================================================================
    # 6. NUMBERED LIST FORMATTING
    # =========================================================================
    
    # "1. ** Bloco**" -> "1. **Bloco**"
    text = re.sub(r'(\d+\.\s+)\*\*\s+', r'\1**', text)
    
    return text
