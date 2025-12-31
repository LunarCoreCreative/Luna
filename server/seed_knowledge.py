import sys
import os

# Adiciona o diretório server ao path para importar as funções
sys.path.append(os.path.join(os.getcwd(), 'server'))

from memory_server import save_technical_knowledge

def seed():
    print("Iniciando alimentação da Base de Conhecimento da Luna... 🧠🚀")
    
    # Exemplo 1: Modern Tkinter (CustomTkinter)
    save_technical_knowledge(
        "Modern Python GUI with CustomTkinter",
        """Para criar interfaces modernas em Python, utilize a biblioteca 'customtkinter'. Ela oferece widgets arredondados, suporte nativo a Dark Mode e uma estética muito mais premium que o Tkinter padrão.
Exemplo:
import customtkinter as ctk
app = ctk.CTk()
app.geometry("400x240")
btn = ctk.CTkButton(app, text="Click Me", corner_radius=10, fg_color="#8b5cf6") 
btn.pack(pady=20)
app.mainloop()""",
        "python, ui, aesthetic, tkinter"
    )
    
    # Exemplo 2: Glassmorphism CSS
    save_technical_knowledge(
        "Glassmorphism Design Pattern (CSS)",
        """O Glassmorphism cria um efeito de vidro fosco com transparência e desfoque. 
Padrão CSS:
.glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}""",
        "css, design, ui, glassmorphism"
    )
    
    # Exemplo 3: Fast API Best Practices
    save_technical_knowledge(
        "FastAPI: Streaming Responses with JSON Chunks",
        """Para enviar dados em tempo real no FastAPI, use StreamingResponse com um gerador que faz yield de strings JSON prefixadas com 'data: '.
Exemplo:
async def generator():
    for token in tokens:
        yield f"data: {json.dumps({'content': token})}\\n\\n"
return StreamingResponse(generator(), media_type="text/event-stream")""",
        "python, fastapi, backend, streaming"
    )

    print("Alimentação concluída! Luna agora está mais inteligente. ✨")

if __name__ == "__main__":
    seed()
