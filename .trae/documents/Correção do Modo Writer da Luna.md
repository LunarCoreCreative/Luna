Vou ajustar o "cérebro" da Luna (`memory_server.py`) para reforçar o comportamento do **Modo Writer**. O problema é que, apesar das instruções existirem, o modelo às vezes prefere responder no chat (o que é o padrão de LLMs) em vez de usar a ferramenta de escrita.

### Plano de Correção:

1.  **Reforçar o Prompt do Sistema (`memory_server.py`)**:
    *   Vou reescrever as instruções do "Modo Writer" para serem mais imperativas e "agressivas" quanto ao uso da ferramenta `write_document`.
    *   Vou adicionar uma regra explícita de **"PROIBIDO TEXTO LONGO NO CHAT"** quando estiver nesse modo.
    *   Vou instruir a Luna a responder no chat apenas com confirmações curtas (ex: "Capítulo criado com sucesso!") após usar a ferramenta.

2.  **Verificar Definição da Tool (`tools.py`)**:
    *   Vou fazer um pequeno ajuste na descrição da ferramenta `write_document` para deixar claro que ela é o **único** meio de entregar conteúdo extenso ao usuário.

### Arquivos afetados:
- `server/memory_server.py` (Lógica principal do agente e Prompt)
- `server/tools.py` (Descrição das ferramentas)

Isso deve forçar a Luna a "jogar" o texto no Canvas (que é o comportamento correto) em vez de apenas falar no chat.